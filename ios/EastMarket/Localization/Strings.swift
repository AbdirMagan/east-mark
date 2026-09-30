import Foundation

/// The four languages the product ships in. Listing and promotion text is
/// localized by the backend through the lang query parameter; this table covers
/// the app's own labels, the same approach the Android app takes.
enum AppLanguage: String, CaseIterable, Identifiable {
    case en, so, am, sw

    var id: String { rawValue }

    var nativeName: String {
        switch self {
        case .en: return "English"
        case .so: return "Af Soomaali"
        case .am: return "አማርኛ"
        case .sw: return "Kiswahili"
        }
    }
}

enum Strings {
    private static let table: [AppLanguage: [String: String]] = [
        .en: [
            "home": "Home", "browse": "Browse", "sell": "Sell", "messages": "Messages",
            "account": "Account", "categories": "Categories", "featured": "Featured",
            "recent": "Recently listed", "search": "Search listings", "refresh": "Refresh",
            "buy": "Buy", "call": "Call", "whatsapp": "WhatsApp", "message": "Message seller",
            "signIn": "Sign in", "signUp": "Create account", "signOut": "Sign out",
            "email": "Email", "password": "Password", "name": "Full name",
            "noListings": "No listings yet", "noMessages": "No conversations yet",
            "typeMessage": "Write a message", "send": "Send", "seen": "Seen", "sending": "Sending",
            "price": "Price", "title": "Title", "description": "Description", "condition": "Condition",
            "post": "Post listing", "favourites": "Saved listings", "language": "Language",
            "retry": "Try again", "loading": "Loading", "ownListing": "This is your listing",
            "video": "Video", "addVideo": "Add a video", "replaceVideo": "Replace the video",
            "videoListings": "Video listings", "photoListings": "Photo listings",
            "videoListingsHint": "Watch full screen, one at a time",
            "photoListingsHint": "Everything sellers photographed",
            "noVideos": "No videos yet", "soundOn": "Sound on", "soundOff": "Sound off",
            "removeVideo": "Remove the video",
            "videoHint": "One video, up to 60 seconds and 20 MB.",
            "videoTooLong": "A video can be at most 60 seconds",
            "videoTooLarge": "That video is too large (20 MB maximum)",
            "signInToMessage": "Sign in to message the seller",
            "offline": "Could not reach the marketplace. Check your connection."
        ],
        .so: [
            "home": "Bogga Hore", "browse": "Raadi", "sell": "Iibi", "messages": "Fariimaha",
            "account": "Koontada", "categories": "Qaybaha", "featured": "La doortay",
            "recent": "Kuwa cusub", "search": "Raadi alaab", "refresh": "Cusboonaysii",
            "buy": "Iibso", "call": "Wac", "whatsapp": "WhatsApp", "message": "Fariin u dir",
            "signIn": "Gal", "signUp": "Koonto samee", "signOut": "Ka bax",
            "email": "Iimayl", "password": "Furaha sirta", "name": "Magaca oo dhan",
            "noListings": "Weli alaab ma jirto", "noMessages": "Weli wada-hadal ma jiro",
            "typeMessage": "Qor fariin", "send": "Dir", "seen": "La arkay", "sending": "Waa la dirayaa",
            "price": "Qiimaha", "title": "Cinwaanka", "description": "Sharaxaad", "condition": "Xaalada",
            "post": "Dhaji alaabta", "favourites": "Alaabta la kaydiyay", "language": "Luqadda",
            "retry": "Isku day mar kale", "loading": "Waa la soo rarayaa",
            "video": "Fiidiyow", "addVideo": "Fiidiyow ku dar",
            "videoListings": "Alaab fiidiyow leh", "photoListings": "Alaab sawiro leh",
            "videoListingsHint": "Shaashadda oo dhan, mid mid",
            "photoListingsHint": "Wax kasta oo la sawiray",
            "noVideos": "Weli fiidiyow ma jiro", "soundOn": "Codka shid", "soundOff": "Codka dami",
            "replaceVideo": "Fiidiyowga beddel", "removeVideo": "Fiidiyowga ka saar",
            "videoHint": "Hal fiidiyow, ilaa 60 ilbiriqsi iyo 20 MB.",
            "videoTooLong": "Fiidiyowgu wuxuu noqon karaa ugu badnaan 60 ilbiriqsi",
            "videoTooLarge": "Fiidiyowgu aad buu u weyn yahay (ugu badnaan 20 MB)",
            "ownListing": "Kani waa shaygaaga",
            "signInToMessage": "Gal si aad iibiyaha ula xiriirto",
            "offline": "Suuqa lama gaari karo. Hubi xiriirkaaga."
        ],
        .am: [
            "home": "መነሻ", "browse": "ያስሱ", "sell": "ይሽጡ", "messages": "መልዕክቶች",
            "account": "መለያ", "categories": "ምድቦች", "featured": "ተመራጭ",
            "recent": "በቅርብ የተለጠፉ", "search": "ዝርዝሮችን ይፈልጉ", "refresh": "አድስ",
            "buy": "ይግዙ", "call": "ይደውሉ", "whatsapp": "WhatsApp", "message": "ለሻጩ መልዕክት",
            "signIn": "ይግቡ", "signUp": "መለያ ይፍጠሩ", "signOut": "ውጣ",
            "email": "ኢሜይል", "password": "የይለፍ ቃል", "name": "ሙሉ ስም",
            "noListings": "እስካሁን ዝርዝር የለም", "noMessages": "እስካሁን ውይይት የለም",
            "typeMessage": "መልዕክት ይጻፉ", "send": "ላክ", "seen": "ታይቷል", "sending": "በመላክ ላይ",
            "price": "ዋጋ", "title": "ርዕስ", "description": "መግለጫ", "condition": "ሁኔታ",
            "post": "ዝርዝር ይለጥፉ", "favourites": "የተቀመጡ ዝርዝሮች", "language": "ቋንቋ",
            "retry": "እንደገና ይሞክሩ", "loading": "በመጫን ላይ",
            "ownListing": "ይህ የእርስዎ ዝርዝር ነው",
            "signInToMessage": "ለሻጩ መልዕክት ለመላክ ይግቡ",
            "offline": "ገበያውን ማግኘት አልተቻለም። ግንኙነትዎን ያረጋግጡ።"
        ],
        .sw: [
            "home": "Mwanzo", "browse": "Vinjari", "sell": "Uza", "messages": "Ujumbe",
            "account": "Akaunti", "categories": "Kategoria", "featured": "Maalum",
            "recent": "Matangazo mapya", "search": "Tafuta matangazo", "refresh": "Onyesha upya",
            "buy": "Nunua", "call": "Piga simu", "whatsapp": "WhatsApp", "message": "Tuma ujumbe",
            "signIn": "Ingia", "signUp": "Fungua akaunti", "signOut": "Toka",
            "email": "Barua pepe", "password": "Nenosiri", "name": "Jina kamili",
            "noListings": "Hakuna matangazo bado", "noMessages": "Hakuna mazungumzo bado",
            "typeMessage": "Andika ujumbe", "send": "Tuma", "seen": "Imeonwa", "sending": "Inatuma",
            "price": "Bei", "title": "Kichwa", "description": "Maelezo", "condition": "Hali",
            "post": "Chapisha tangazo", "favourites": "Matangazo yaliyohifadhiwa", "language": "Lugha",
            "retry": "Jaribu tena", "loading": "Inapakia",
            "ownListing": "Hili ni tangazo lako",
            "signInToMessage": "Ingia ili kumtumia muuzaji ujumbe",
            "offline": "Imeshindwa kufikia soko. Angalia muunganisho wako."
        ]
    ]

    /// Falls back to English rather than rendering a blank label.
    static func value(_ key: String, _ language: AppLanguage) -> String {
        if let localized = table[language]?[key] { return localized }
        if let english = table[.en]?[key] { return english }
        return key
    }
}
