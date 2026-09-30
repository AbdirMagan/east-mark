import AVFoundation
import PhotosUI
import SwiftUI
import UIKit

/// A video the seller picked, already checked against the marketplace's limits.
struct PickedVideo {
    let data: Data
    let contentType: String
    let durationSeconds: Int
    /// One frame, uploaded as the poster so browsing costs kilobytes.
    let poster: Data?
}

/// Posting a listing, in the order the backend needs it: create the listing as
/// a draft, upload the photo straight to storage with the signed URL, register
/// it, then move the listing into moderation.
///
/// It has to be that order because the storage path contains the listing id,
/// and creating the draft first means a listing interrupted mid-upload lands in
/// the seller's drafts rather than reaching a moderator half-built.
@MainActor
final class SellViewModel: ObservableObject {
    @Published var categories: [Category] = []
    @Published var countries: [Country] = []
    @Published var cities: [Place] = []
    @Published var isPosting = false
    @Published var message: String?
    @Published var didPost = false

    func loadReferenceData(language: AppLanguage) async {
        if categories.isEmpty {
            categories = (try? await API.categories(lang: language.rawValue)) ?? []
        }
        if countries.isEmpty {
            countries = (try? await API.countries(lang: language.rawValue)) ?? []
        }
    }

    func loadCities(countryId: Int, language: AppLanguage) async {
        cities = (try? await API.cities(countryId: countryId, lang: language.rawValue)) ?? []
    }

    func post(
        title: String,
        price: Double,
        currency: String,
        categoryId: Int,
        condition: String,
        countryId: Int,
        cityId: Int?,
        description: String,
        phone: String,
        photo: Data?,
        video: PickedVideo?
    ) async {
        isPosting = true
        message = nil

        var fields: [String: Any] = [
            "title": title,
            "price": price,
            "currency": currency,
            "categoryId": categoryId,
            "condition": condition,
            "countryId": countryId
        ]
        if let cityId { fields["cityId"] = cityId }
        if !description.isEmpty { fields["description"] = description }
        if !phone.isEmpty { fields["phone"] = phone }

        do {
            let listing = try await API.createListing(fields)

            if let photo {
                let slots = try await API.uploadSlots(productId: listing.id, contentType: "image/jpeg")
                try await APIClient.shared.upload(to: slots.full.uploadUrl, data: photo, contentType: "image/jpeg")
                let thumbnail = SellViewModel.resize(photo, maxDimension: 400) ?? photo
                try await APIClient.shared.upload(
                    to: slots.thumbnail.uploadUrl,
                    data: thumbnail,
                    contentType: "image/jpeg"
                )
                _ = try await API.registerImage(
                    productId: listing.id,
                    path: slots.full.path,
                    thumbnailPath: slots.thumbnail.path
                )
            }

            // The video goes after the photo: it is by far the larger upload, so
            // an interrupted one still leaves a listing with its photo.
            if let video {
                let slots = try await API.uploadSlots(
                    productId: listing.id,
                    contentType: video.contentType
                )
                try await APIClient.shared.upload(
                    to: slots.full.uploadUrl,
                    data: video.data,
                    contentType: video.contentType
                )
                var posterPath: String?
                if let poster = video.poster {
                    try await APIClient.shared.upload(
                        to: slots.thumbnail.uploadUrl,
                        data: poster,
                        contentType: "image/jpeg"
                    )
                    posterPath = slots.thumbnail.path
                }
                _ = try await API.registerVideo(
                    productId: listing.id,
                    path: slots.full.path,
                    posterPath: posterPath,
                    durationSeconds: video.durationSeconds
                )
            }

            try await API.submitForReview(productId: listing.id)
            message = "Sent for review. It appears once a moderator approves it."
            didPost = true
        } catch {
            message = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }

        isPosting = false
    }

    /// Reads the duration and a poster frame, and enforces the marketplace's
    /// limits before anything is uploaded. Returns nil with a message set when
    /// the video is too long or too large.
    func prepareVideo(_ data: Data, fileExtension: String) async -> PickedVideo? {
        let maxBytes = 20 * 1024 * 1024
        if data.count > maxBytes {
            message = "That video is too large (20 MB maximum)."
            return nil
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(fileExtension)

        do {
            try data.write(to: url)
        } catch {
            message = "That video could not be read."
            return nil
        }
        defer { try? FileManager.default.removeItem(at: url) }

        let asset = AVURLAsset(url: url)
        let seconds = CMTimeGetSeconds(asset.duration)
        guard seconds.isFinite, seconds > 0 else {
            message = "That video could not be read."
            return nil
        }
        if seconds > 60.5 {
            message = "A video can be at most 60 seconds."
            return nil
        }

        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 640, height: 640)
        let poster = (try? generator.copyCGImage(
            at: CMTime(seconds: min(0.5, seconds / 2), preferredTimescale: 600),
            actualTime: nil
        )).flatMap { UIImage(cgImage: $0).jpegData(compressionQuality: 0.75) }

        return PickedVideo(
            data: data,
            contentType: fileExtension == "mov" ? "video/quicktime" : "video/mp4",
            durationSeconds: max(1, Int(seconds.rounded())),
            poster: poster
        )
    }

    /// A phone camera produces several megabytes; uploading that over a 3G
    /// uplink takes most of a minute, so the photo is shrunk first.
    static func resize(_ data: Data, maxDimension: CGFloat) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let longest = max(image.size.width, image.size.height)
        guard longest > maxDimension else { return image.jpegData(compressionQuality: 0.8) }

        let scale = maxDimension / longest
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let scaled = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        return scaled.jpegData(compressionQuality: 0.8)
    }
}

struct SellView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var auth: AuthStore
    @StateObject private var model = SellViewModel()

    @State private var title = ""
    @State private var priceText = ""
    @State private var currency = "USD"
    @State private var category: Category?
    @State private var condition = "used"
    @State private var country: Country?
    @State private var city: Place?
    @State private var description = ""
    @State private var phone = ""
    @State private var photoItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var videoItem: PhotosPickerItem?
    @State private var video: PickedVideo?
    @State private var readingVideo = false

    private let conditions = ["new", "like_new", "used", "refurbished"]

    var body: some View {
        NavigationStack {
            Group {
                if auth.isSignedIn {
                    form
                } else {
                    VStack(spacing: 10) {
                        Image(systemName: "lock").font(.largeTitle).foregroundColor(Brand.muted)
                        Text(state.t("signIn"))
                            .font(.subheadline)
                            .foregroundColor(Brand.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Brand.sand)
                }
            }
            .navigationTitle(state.t("sell"))
            .task {
                await model.loadReferenceData(language: state.language)
                if country == nil {
                    country = model.countries.first(where: { $0.id == state.countryId }) ?? model.countries.first
                }
                if let country {
                    currency = country.defaultCurrency ?? "USD"
                    await model.loadCities(countryId: country.id, language: state.language)
                }
            }
        }
    }

    private var form: some View {
        Form {
            Section(state.t("title")) {
                TextField(state.t("title"), text: $title)

                HStack {
                    TextField(state.t("price"), text: $priceText)
                        .keyboardType(.decimalPad)
                    Picker("", selection: $currency) {
                        ForEach(["USD", "SLSH", "ETB", "KES", "DJF"], id: \.self) { code in
                            Text(code).tag(code)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                }

                Picker(state.t("categories"), selection: $category) {
                    Text("-").tag(Category?.none)
                    ForEach(model.categories) { item in
                        Text(item.name).tag(Category?.some(item))
                    }
                }

                Picker(state.t("condition"), selection: $condition) {
                    ForEach(conditions, id: \.self) { value in
                        Text(value.replacingOccurrences(of: "_", with: " ")).tag(value)
                    }
                }
            }

            Section {
                Picker("Country", selection: $country) {
                    Text("-").tag(Country?.none)
                    ForEach(model.countries) { item in
                        Text(item.name).tag(Country?.some(item))
                    }
                }
                .onChange(of: country) { selected in
                    guard let selected else { return }
                    currency = selected.defaultCurrency ?? currency
                    city = nil
                    Task { await model.loadCities(countryId: selected.id, language: state.language) }
                }

                Picker("City", selection: $city) {
                    Text("-").tag(Place?.none)
                    ForEach(model.cities) { item in
                        Text(item.name).tag(Place?.some(item))
                    }
                }

                TextField("Phone (+252...)", text: $phone)
                    .keyboardType(.phonePad)
            }

            Section(state.t("description")) {
                TextField(state.t("description"), text: $description, axis: .vertical)
                    .lineLimit(3...8)
            }

            Section("Photo") {
                PhotosPicker(selection: $photoItem, matching: .images) {
                    Label(photoData == nil ? "Choose a photo" : "Replace photo", systemImage: "photo")
                }
                .onChange(of: photoItem) { item in
                    Task {
                        guard let data = try? await item?.loadTransferable(type: Data.self) else { return }
                        photoData = SellViewModel.resize(data, maxDimension: 1600) ?? data
                    }
                }

                if let photoData, let image = UIImage(data: photoData) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 160)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            Section(state.t("video")) {
                PhotosPicker(selection: $videoItem, matching: .videos) {
                    Label(
                        video == nil ? state.t("addVideo") : state.t("replaceVideo"),
                        systemImage: "play.rectangle"
                    )
                }
                .onChange(of: videoItem) { item in
                    Task {
                        guard let item else { return }
                        readingVideo = true
                        defer { readingVideo = false }
                        guard let data = try? await item.loadTransferable(type: Data.self) else {
                            return
                        }
                        // PhotosUI hands back whatever the phone recorded; iPhones
                        // record QuickTime, everything else MP4.
                        video = await model.prepareVideo(data, fileExtension: "mov")
                    }
                }

                if readingVideo {
                    ProgressView()
                } else if let video {
                    HStack {
                        Image(systemName: "play.circle.fill").foregroundColor(Brand.acacia)
                        Text(String(
                            format: "%d:%02d",
                            video.durationSeconds / 60,
                            video.durationSeconds % 60
                        ))
                        .font(.footnote)
                        Spacer()
                        Button(state.t("removeVideo")) { self.video = nil; videoItem = nil }
                            .font(.footnote)
                            .foregroundColor(Brand.clayDark)
                    }
                } else {
                    Text(state.t("videoHint"))
                        .font(.footnote)
                        .foregroundColor(Brand.muted)
                }
            }

            if let message = model.message {
                Section {
                    Text(message)
                        .font(.footnote)
                        .foregroundColor(model.didPost ? Brand.acacia : Brand.clayDark)
                }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    if model.isPosting {
                        ProgressView()
                    } else {
                        Text(state.t("post")).frame(maxWidth: .infinity)
                    }
                }
                .disabled(!canSubmit || model.isPosting)
            }
        }
    }

    private var canSubmit: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            && Double(priceText) != nil
            && category != nil
            && country != nil
    }

    private func submit() async {
        guard
            let category,
            let country,
            let price = Double(priceText)
        else { return }

        await model.post(
            title: title.trimmingCharacters(in: .whitespaces),
            price: price,
            currency: currency,
            categoryId: category.id,
            condition: condition,
            countryId: country.id,
            cityId: city?.id,
            description: description,
            phone: phone,
            photo: photoData,
            video: video
        )

        if model.didPost {
            title = ""
            priceText = ""
            description = ""
            photoData = nil
            photoItem = nil
            video = nil
            videoItem = nil
        }
    }
}
