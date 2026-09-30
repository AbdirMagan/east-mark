package com.example.ui.screens

import android.media.MediaPlayer
import android.net.Uri
import android.widget.VideoView
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import coil.compose.AsyncImage
import com.example.R
import com.example.data.model.CategoryItem
import com.example.data.model.Product
import com.example.data.remote.VideoCache
import com.example.domain.CurrencyConverter
import com.example.domain.LocalizationManager
import com.example.ui.theme.BrandNavy
import com.example.ui.viewmodel.MarketplaceViewModel

/**
 * The video feed: listings that were filmed, one per screen, swiped vertically.
 *
 * It wears the app's own chrome — the top bar, the category strip and (through
 * the host Scaffold) the bottom navigation — rather than taking the screen
 * over. Someone who arrives here from the home screen is still shopping;
 * stripping the navigation would make the feed a place they have to back out of.
 *
 * Only the page in view plays. VerticalPager keeps the neighbours composed, so
 * each slide checks whether it is the current page before it touches the
 * network: on a metered bundle, three videos buffering ahead of a buyer who
 * swiped past them is money spent for nothing.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VideoFeedScreen(
    viewModel: MarketplaceViewModel,
    onProductClick: (Product) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val products by viewModel.videoProducts.collectAsState()
    val isLoading by viewModel.isLoadingVideos.collectAsState()
    val selectedCategory by viewModel.videoCategoryId.collectAsState()
    val language by viewModel.selectedLanguage.collectAsState()
    val displayCurrency by viewModel.selectedCurrency.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadVideoProducts() }

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // The category strip stays put while the feed scrolls under it: it is
        // how someone narrows twenty videos down to the cars.
        CategoryStrip(
            categories = viewModel.getCategories(),
            selectedId = selectedCategory,
            allLabel = LocalizationManager.getString("categories", language),
            onSelect = { id -> viewModel.loadVideoProducts(id) }
        )

        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            when {
                isLoading && products.isEmpty() -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                products.isEmpty() -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.align(Alignment.Center).padding(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.PlayArrow,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = LocalizationManager.getString("no_videos", language),
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                else -> {
                    val pagerState = rememberPagerState(pageCount = { products.size })

                    VerticalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize().testTag("video_feed_pager")
                    ) { page ->
                        VideoFeedSlide(
                            product = products[page],
                            isCurrent = pagerState.currentPage == page,
                            priceLabel = CurrencyConverter.formatConverted(
                                products[page].price,
                                products[page].originalCurrency,
                                displayCurrency
                            ),
                            buyLabel = LocalizationManager.getString("buy_now", language),
                            chatLabel = LocalizationManager.getString("chat", language),
                            onOpen = { onProductClick(products[page]) }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryStrip(
    categories: List<CategoryItem>,
    selectedId: String?,
    allLabel: String,
    onSelect: (String?) -> Unit
) {
    Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            item {
                FilterChip(
                    selected = selectedId == null,
                    onClick = { onSelect(null) },
                    label = { Text(allLabel, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandNavy,
                        selectedLabelColor = Color.White
                    )
                )
            }
            items(categories) { category ->
                val selected = selectedId == category.id
                FilterChip(
                    selected = selected,
                    onClick = { onSelect(if (selected) null else category.id) },
                    label = { Text(category.name, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandNavy,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }
    }
}

@Composable
private fun VideoFeedSlide(
    product: Product,
    isCurrent: Boolean,
    priceLabel: String,
    buyLabel: String,
    chatLabel: String,
    onOpen: () -> Unit
) {
    val context = LocalContext.current
    var playing by remember(product.id) { mutableStateOf(false) }
    var view by remember(product.id) { mutableStateOf<VideoView?>(null) }
    var localPath by remember(product.id) { mutableStateOf<String?>(null) }
    // The frame's own shape, learned when the player is prepared, so the video
    // can be scaled to cover the slide instead of sitting in bars.
    var videoAspect by remember(product.id) { mutableStateOf(0f) }

    // The file is fetched with OkHttp and played from disk; see VideoCache for
    // why the platform's own HTTP stack is not used. Nothing downloads until
    // the slide is the one on screen.
    LaunchedEffect(isCurrent, product.videoUrl) {
        if (isCurrent && product.videoUrl != null && localPath == null) {
            localPath = VideoCache.localFile(context, product.videoUrl)?.absolutePath
        }
        if (!isCurrent) {
            view?.pause()
            playing = false
        }
    }

    DisposableEffect(product.id) {
        onDispose {
            view?.stopPlayback()
            view = null
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            // Matching the app's background means the edge of a video that
            // cannot fill the slide reads as part of the app, not as a black hole.
            .background(MaterialTheme.colorScheme.background)
            .clipToBounds()
    ) {
        val slotWidth = maxWidth
        val slotHeight = maxHeight
        val slotAspect = if (slotHeight.value > 0f) slotWidth.value / slotHeight.value else 1f

        val path = localPath
        if (isCurrent && path != null) {
            // Cover, not contain: whichever scale factor is larger, with the
            // overflow clipped by the box above.
            // requiredWidth/Height rather than width/height: the ordinary
            // modifiers are a preference the parent may clamp, and covering the
            // slide means deliberately overflowing it and clipping the rest.
            val videoModifier = if (videoAspect > 0f) {
                if (videoAspect > slotAspect) {
                    Modifier.requiredHeight(slotHeight).requiredWidth(slotHeight * videoAspect)
                } else {
                    Modifier.requiredWidth(slotWidth).requiredHeight(slotWidth / videoAspect)
                }
            } else {
                Modifier.fillMaxSize()
            }

            AndroidView(
                factory = { viewContext ->
                    VideoView(viewContext).apply {
                        setVideoURI(Uri.fromFile(java.io.File(path)))
                        setOnPreparedListener { media ->
                            media.isLooping = true
                            if (media.videoHeight > 0) {
                                videoAspect = media.videoWidth.toFloat() / media.videoHeight
                            }
                            start()
                        }
                        // The poster stays up until a frame is actually on
                        // screen. Hiding it at onPrepared leaves an empty
                        // rectangle for as long as the buffer takes.
                        setOnInfoListener { media, what, _ ->
                            if (what == MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START) {
                                playing = true
                                // Some files report 0x0 at onPrepared and only
                                // know their size once a frame has been
                                // decoded; without this the slide keeps the
                                // bars it was trying to avoid.
                                if (media.videoHeight > 0) {
                                    videoAspect = media.videoWidth.toFloat() / media.videoHeight
                                }
                            }
                            false
                        }
                        setOnErrorListener { _, _, _ ->
                            playing = false
                            true
                        }
                        view = this
                    }
                },
                modifier = videoModifier
                    .align(Alignment.Center)
                    .clickable {
                        val player = view ?: return@clickable
                        if (player.isPlaying) {
                            player.pause()
                            playing = false
                        } else {
                            player.start()
                            playing = true
                        }
                    }
            )
        }

        if (!playing) {
            val poster = product.videoPosterUrl ?: product.imageUrls.firstOrNull()
            if (poster != null) {
                AsyncImage(
                    model = poster,
                    contentDescription = product.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Icon(
                    painter = painterResource(id = R.drawable.ic_image_placeholder),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.align(Alignment.Center).size(48.dp)
                )
            }

            if (isCurrent) {
                // Buffering. A video is megabytes; on 3G this wait is real and
                // silence here reads as a broken app.
                CircularProgressIndicator(
                    color = Color.White,
                    strokeWidth = 2.dp,
                    modifier = Modifier.align(Alignment.Center).size(34.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier.align(Alignment.Center).size(56.dp)
                )
            }
        }

        // A scrim, so white text stays readable over a bright video.
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(200.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                    )
                )
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Text(
                text = priceLabel,
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = product.title,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.LocationOn,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.75f),
                    modifier = Modifier.size(13.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "${product.city} · ${product.sellerName}",
                    color = Color.White.copy(alpha = 0.75f),
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.clickable(onClick = onOpen)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.ShoppingCart,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = buyLabel,
                            color = Color.Black,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Surface(
                    color = Color.Transparent,
                    shape = RoundedCornerShape(24.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        Color.White.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier.clickable(onClick = onOpen)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Chat,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = chatLabel,
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}
