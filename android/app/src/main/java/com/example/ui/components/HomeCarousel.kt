package com.example.ui.components

import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.R
import com.example.data.model.HomeAd
import com.example.ui.theme.BrandNavy
import kotlinx.coroutines.delay

/**
 * The home carousel: the same promotions as the web app's hero, from
 * GET /ads?placement=home_hero, with the same colour themes, badge, title,
 * subtitle, button and icon. Staff edit the slides in the admin dashboard;
 * nothing here needs a release to change what is advertised.
 *
 * Auto-advances every 6 seconds, stops while the user is swiping, and does not
 * auto-advance at all when animations are turned off in system settings.
 */
@Composable
fun HomeCarousel(
    ads: List<HomeAd>,
    onAdClick: (HomeAd) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val animationsOff = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    val pagerState = rememberPagerState(pageCount = { ads.size })
    val isDragged by pagerState.interactionSource.collectIsDraggedAsState()

    LaunchedEffect(ads.size, isDragged, animationsOff) {
        if (ads.size < 2 || isDragged || animationsOff) return@LaunchedEffect
        while (true) {
            delay(6_000)
            pagerState.animateScrollToPage((pagerState.currentPage + 1) % ads.size)
        }
    }

    Column(modifier = modifier) {
        HorizontalPager(
            state = pagerState,
            pageSpacing = 12.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(172.dp)
                .testTag("home_carousel")
        ) { page ->
            val ad = ads[page]
            AdSlide(ad = ad, onClick = { onAdClick(ad) })
        }

        if (ads.size > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.Center
            ) {
                repeat(ads.size) { index ->
                    val selected = pagerState.currentPage == index
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .height(6.dp)
                            .width(if (selected) 20.dp else 6.dp)
                            .clip(CircleShape)
                            .background(if (selected) BrandNavy else BrandNavy.copy(alpha = 0.25f))
                    )
                }
            }
        }
    }
}

/** Shown when no promotions are running or the API is unreachable. */
fun welcomeAd(): HomeAd = HomeAd(
    id = "fallback-welcome",
    title = "Buy & Sell Across East Africa",
    subtitle = "Verified sellers • Direct WhatsApp & Phone • Multi-Currency",
    badge = null,
    ctaLabel = null,
    theme = "night",
    icon = "map",
    imageUrl = null,
    targetType = "search",
    targetValue = "",
    categoryId = null
)

/* Same gradients as the web carousel (web/src/components/home/HeroCarousel.tsx). */
private fun themeBrush(theme: String): Brush = when (theme) {
    "acacia" -> Brush.linearGradient(listOf(Color(0xFF061A16), Color(0xFF144E41), Color(0xFF1E6F5C)))
    "clay" -> Brush.linearGradient(listOf(Color(0xFF281206), Color(0xFF7D3712), Color(0xFFD9743A)))
    "sun" -> Brush.linearGradient(listOf(Color(0xFF26180A), Color(0xFF8B5A24), Color(0xFFD4913F)))
    "navy" -> Brush.linearGradient(listOf(Color(0xFF0B1A33), Color(0xFF1D3F72), Color(0xFF2F63AD)))
    else -> Brush.linearGradient(listOf(Color(0xFF040914), Color(0xFF0B1630)))
}

private fun iconRes(icon: String?): Int? = when (icon) {
    "electronics" -> R.drawable.ic_cat_electronics
    "house" -> R.drawable.ic_cat_house
    "car" -> R.drawable.ic_cat_car
    "land" -> R.drawable.ic_cat_land
    "livestock" -> R.drawable.ic_cat_livestock
    "goods" -> R.drawable.ic_cat_goods
    else -> null
}

@Composable
private fun AdSlide(ad: HomeAd, onClick: () -> Unit) {
    val night = ad.theme == "night"
    val glyph = iconRes(ad.icon)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(18.dp))
            .background(themeBrush(ad.theme))
            .clickable(onClick = onClick)
            .semantics { contentDescription = listOfNotNull(ad.badge, ad.title, ad.subtitle).joinToString(". ") }
    ) {
        if (night) DotGrid(Modifier.fillMaxSize())

        // Right-hand artwork: a photo if the promotion has one, else the neon
        // Horn of Africa map for the night theme, else the category glyph.
        when {
            ad.imageUrl != null -> AsyncImage(
                model = ad.imageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .fillMaxHeight()
                    .fillMaxWidth(0.4f)
            )
            night || glyph == null -> HornMapMini(
                Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 8.dp)
                    .size(width = 150.dp, height = 140.dp)
            )
            else -> Icon(
                painter = painterResource(id = glyph),
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.92f),
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 20.dp)
                    .size(96.dp)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(0.66f)
                .padding(16.dp),
            verticalArrangement = Arrangement.Center
        ) {
            ad.badge?.let { badge ->
                Surface(
                    color = Color(0xFFE9BB63),
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.rotate(-2f)
                ) {
                    Text(
                        text = badge.uppercase(),
                        color = Color(0xFF1A1713),
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
            }
            Text(
                text = ad.title,
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                lineHeight = 21.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            ad.subtitle?.let { subtitle ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            ad.ctaLabel?.let { label ->
                Spacer(modifier = Modifier.height(8.dp))
                Surface(color = Color(0xFFB8531A), shape = RoundedCornerShape(8.dp)) {
                    Text(
                        text = label,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun DotGrid(modifier: Modifier) {
    Canvas(modifier) {
        val step = 18.dp.toPx()
        val radius = 1.dp.toPx()
        var x = step / 2
        while (x < size.width) {
            var y = step / 2
            while (y < size.height) {
                drawCircle(Color.White.copy(alpha = 0.12f), radius = radius, center = Offset(x, y))
                y += step
            }
            x += step
        }
    }
}

/*
 * The five markets with their neon colours, from the web's HornMap
 * (web/src/components/brand/HornMap.tsx): same coordinates, same order.
 */
private val HORN_SHAPES: List<Pair<Color, List<Float>>> = listOf(
    Color(0xFFFFD700) to listOf(510f, 275f, 590f, 260f, 650f, 285f, 685f, 310f, 705f, 325f, 720f, 360f, 780f, 390f, 810f, 410f, 770f, 470f, 705f, 520f, 655f, 570f, 595f, 580f, 550f, 620f, 505f, 560f, 485f, 480f, 435f, 420f, 475f, 350f),
    Color(0xFF00D8FF) to listOf(870f, 335f, 935f, 345f, 970f, 380f, 920f, 450f, 835f, 530f, 740f, 600f, 680f, 645f, 655f, 570f, 705f, 520f, 770f, 470f, 810f, 410f, 780f, 390f, 872f, 390f),
    Color(0xFF00FF9D) to listOf(695f, 285f, 755f, 295f, 815f, 310f, 870f, 335f, 872f, 390f, 780f, 390f, 720f, 360f, 705f, 325f, 685f, 310f),
    Color(0xFFFF007F) to listOf(550f, 620f, 595f, 580f, 655f, 570f, 680f, 645f, 625f, 715f, 575f, 735f, 555f, 685f),
    Color(0xFFFF6B4A) to listOf(670f, 280f, 695f, 285f, 705f, 310f, 685f, 310f, 668f, 292f)
)

@Composable
private fun HornMapMini(modifier: Modifier) {
    Canvas(modifier) {
        val minX = 430f
        val minY = 255f
        val width = 545f
        val height = 485f
        val scale = minOf(size.width / width, size.height / height)
        val offsetX = (size.width - width * scale) / 2
        val offsetY = (size.height - height * scale) / 2

        HORN_SHAPES.forEach { (color, points) ->
            val path = Path()
            points.chunked(2).forEachIndexed { index, point ->
                val px = offsetX + (point[0] - minX) * scale
                val py = offsetY + (point[1] - minY) * scale
                if (index == 0) path.moveTo(px, py) else path.lineTo(px, py)
            }
            path.close()
            drawPath(path, color.copy(alpha = 0.18f))
            drawPath(path, color, style = Stroke(width = 1.6.dp.toPx(), join = StrokeJoin.Round))
        }
    }
}
