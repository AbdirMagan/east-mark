import SwiftUI

@MainActor
final class MessagesViewModel: ObservableObject {
    @Published var conversations: [ConversationSummary] = []
    @Published var errorMessage: String?

    func load() async {
        do {
            conversations = try await API.conversations()
            errorMessage = nil
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

/// The inbox: the same conversations as the web app and Android, from the
/// backend, so a chat started on one device continues on another.
struct MessagesView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var auth: AuthStore
    @StateObject private var model = MessagesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if !auth.isSignedIn {
                    signedOut
                } else if model.conversations.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.largeTitle)
                            .foregroundColor(Brand.muted)
                        Text(state.t("noMessages"))
                            .font(.subheadline)
                            .foregroundColor(Brand.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Brand.sand)
                } else {
                    List(model.conversations) { conversation in
                        NavigationLink(value: conversation) {
                            row(conversation)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .background(Brand.sand)
            .navigationTitle(state.t("messages"))
            .refreshable { await model.load() }
            .navigationDestination(for: ConversationSummary.self) { conversation in
                ChatView(
                    conversationId: conversation.id,
                    otherName: conversation.otherParty.name,
                    productTitle: conversation.product?.title ?? ""
                )
            }
            .task(id: auth.isSignedIn) {
                guard auth.isSignedIn else { return }
                // Fresh when the tab opens, then every fifteen seconds while it shows.
                while !Task.isCancelled {
                    await model.load()
                    await state.refreshUnread()
                    try? await Task.sleep(nanoseconds: 15_000_000_000)
                }
            }
        }
    }

    private func row(_ conversation: ConversationSummary) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Brand.navy)
                Text(String(conversation.otherParty.name.prefix(1)).uppercased())
                    .foregroundColor(.white)
                    .font(.headline)
            }
            .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 3) {
                Text(conversation.otherParty.name)
                    .font(.subheadline.weight(.semibold))

                if let product = conversation.product {
                    Text(product.title)
                        .font(.caption)
                        .foregroundColor(Brand.acacia)
                        .lineLimit(1)
                }

                Text(preview(conversation))
                    .font(.caption)
                    .foregroundColor(Brand.muted)
                    .lineLimit(1)
            }

            Spacer()

            if conversation.unreadCount > 0 {
                Text(String(conversation.unreadCount))
                    .font(.caption2.bold())
                    .foregroundColor(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Brand.clay)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }

    private func preview(_ conversation: ConversationSummary) -> String {
        let text = conversation.lastMessagePreview ?? ""
        return conversation.lastSenderIsMe ? "You: " + text : text
    }

    private var signedOut: some View {
        VStack(spacing: 14) {
            Text(state.t("signInToMessage"))
                .font(.subheadline)
                .foregroundColor(Brand.muted)
                .multilineTextAlignment(.center)
        }
        .padding(30)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.sand)
    }
}
