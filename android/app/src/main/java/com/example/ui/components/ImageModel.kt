package com.example.ui.components

import android.util.Base64
import java.net.URLDecoder
import java.nio.ByteBuffer

/**
 * Coil 2.x fetches http(s) URLs out of the box, but not `data:` URIs — and
 * the seed listings' thumbnails are inline base64 SVGs. Decoding to a
 * ByteBuffer here routes them through Coil's built-in ByteBufferFetcher
 * instead, which SvgDecoder (registered in MainActivity) can then render.
 */
fun String?.toCoilModel(): Any? {
    if (this.isNullOrBlank()) return null
    if (!startsWith("data:")) return this
    val comma = indexOf(',')
    if (comma == -1) return null
    val meta = substring(5, comma)
    val payload = substring(comma + 1)
    return runCatching {
        val bytes = if (meta.contains(";base64")) {
            Base64.decode(payload, Base64.DEFAULT)
        } else {
            URLDecoder.decode(payload, "UTF-8").toByteArray()
        }
        ByteBuffer.wrap(bytes)
    }.getOrNull()
}
