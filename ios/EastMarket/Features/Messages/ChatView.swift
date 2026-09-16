import SwiftUI

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var pending: [String] = []
    @Published var errorMessage: String?

    private let conversationId: String

    init(conversationId: String) {
        self.conversationId = conversationId
    }

    func load() async {
        do {
            let page = try await API.messages(conversationId: conversationId)
            messages = page.items
            errorMessage = nil
            // Anything unread from the other person is read now that it is on screen.
            if page.items.contains(where: { !$0.isMine && $0.readAt == nil }) {
                await API.markRead(conversationId: conversationId)
            }
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func send(_ text: String) async {
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        pending.append(body)
        do {
            let saved = try await API.sendMessage(conversationId: conversationId, body: body)
            pending.removeAll { $0 == body }
            if !messages.contains(where: { $0.id == saved.id }) {
                messages.append(saved)
            }
        } catch {
            pending.removeAll { $0 == body }
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

/// One conversation. Refreshes every four seconds while open, which is how the
/// Android app keeps a thread current without a websocket.
struct ChatView: View {
    let conversationId: String
    let otherName: String
    let productTitle: String

    @EnvironmentObject private var state: AppState
    @StateObject private var model: ChatViewModel
    @State private var draft = ""

    init(conversationId: String, otherName: String, productTitle: String) {
        self.conversationId = conversationId
        self.otherName = otherName
        self.productTitle = productTitle
        _model = StateObject(wrappedValue: ChatViewModel(conversationId: conversationId))
    }

    var body: some View {
        VStack(spacing: 0) {
            if !productTitle.isEmpty {
                HStack {
                    Image(systemName: "tag")
                    Text(productTitle).font(.footnote.weight(.medium)).lineLimit(1)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Brand.sandDeep)
            }

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(model.messages) { message in
                            bubble(
                                text: message.body ?? "",
                                isMine: message.isMine,
                                footnote: message.isMine && message.readAt != nil ? state.t("seen") : nil
                            )
                            .id(message.id)
                        }

                        ForEach(model.pending, id: \.self) { text in
                            bubble(text: text, isMine: true, footnote: state.t("sending"))
                        }
                    }
                    .padding(16)
                }
                .onChange(of: model.messages.count) { _ in
                    if let last = model.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            composer
        }
        .background(Brand.sand)
        .navigationTitle(otherName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            while !Task.isCancelled {
                await model.load()
                try? await Task.sleep(nanoseconds: 4_000_000_000)
            }
        }
    }

    private func bubble(text: String, isMine: Bool, footnote: String?) -> some View {
        HStack {
            if isMine { Spacer(minLength: 40) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 3) {
                Text(text)
                    .font(.system(size: 15))
                    .foregroundColor(isMine ? .white : Brand.ink)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(isMine ? Brand.navy : Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                if let footnote {
                    Text(footnote).font(.caption2).foregroundColor(Brand.muted)
                }
            }
            if !isMine { Spacer(minLength: 40) }
        }
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField(state.t("typeMessage"), text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.white)
                .clipShape(Capsule())
                .overlay(Capsule().strokeBorder(Brand.sandDeep, lineWidth: 1))

            Button {
                let text = draft
                draft = ""
                Task { await model.send(text) }
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 42, height: 42)
                    .background(Brand.clay)
                    .clipShape(Circle())
            }
            .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
            .accessibilityLabel(state.t("send"))
        }
        .padding(12)
        .background(Color.white)
    }
}
