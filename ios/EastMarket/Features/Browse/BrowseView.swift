import SwiftUI

@MainActor
final class BrowseViewModel: ObservableObject {
    @Published var results: [ProductCard] = []
    @Published var categories: [Category] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadCategories(language: AppLanguage) async {
        if categories.isEmpty {
            categories = (try? await API.categories(lang: language.rawValue)) ?? []
        }
    }

    func search(text: String, category: Category?, countryId: Int?, sort: String) async {
        isLoading = true
        errorMessage = nil
        do {
            results = try await API.products(
                search: text.isEmpty ? nil : text,
                categoryId: category?.id,
                countryId: countryId,
                sort: sort,
                limit: 40
            )
        } catch {
            results = []
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        isLoading = false
    }
}

struct BrowseView: View {
    var initialCategory: Category?

    @EnvironmentObject private var state: AppState
    @StateObject private var model = BrowseViewModel()
    @State private var query = ""
    @State private var category: Category?
    @State private var sort = "newest"

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    private let sorts: [(key: String, label: String)] = [
        ("newest", "Newest"),
        ("price_asc", "Price: low to high"),
        ("price_desc", "Price: high to low"),
        ("popular", "Most viewed")
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(model.results) { product in
                        ProductCardView(product: product)
                    }
                }
                .padding(16)

                if model.results.isEmpty {
                    Text(model.isLoading ? state.t("loading") : state.t("noListings"))
                        .font(.subheadline)
                        .foregroundColor(Brand.muted)
                        .padding(.top, 40)
                }

                if let message = model.errorMessage {
                    Text(message)
                        .font(.footnote)
                        .foregroundColor(Brand.clayDark)
                        .padding()
                }
            }
            .background(Brand.sand)
            .navigationTitle(state.t("browse"))
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, prompt: state.t("search"))
            .onSubmit(of: .search) { reload() }
            .refreshable { await runSearch() }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Picker("Sort", selection: $sort) {
                            ForEach(sorts, id: \.key) { option in
                                Text(option.label).tag(option.key)
                            }
                        }
                        Picker(state.t("categories"), selection: $category) {
                            Text("All").tag(Category?.none)
                            ForEach(model.categories) { item in
                                Text(item.name).tag(Category?.some(item))
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .navigationDestination(for: Int.self) { ref in
                ProductDetailView(ref: ref)
            }
            .task {
                category = category ?? initialCategory
                await model.loadCategories(language: state.language)
                await runSearch()
            }
            .onChange(of: sort) { _ in reload() }
            .onChange(of: category) { _ in reload() }
        }
    }

    private func reload() {
        Task { await runSearch() }
    }

    private func runSearch() async {
        await model.search(text: query, category: category, countryId: state.countryId, sort: sort)
    }
}
