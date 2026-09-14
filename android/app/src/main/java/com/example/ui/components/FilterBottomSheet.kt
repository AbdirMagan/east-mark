package com.example.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppLanguage
import com.example.data.model.FilterCriteria
import com.example.data.model.ProductCondition
import com.example.data.model.SortOption
import com.example.domain.LocalizationManager
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FilterBottomSheet(
    initialFilter: FilterCriteria,
    language: AppLanguage,
    onApply: (min: Double?, max: Double?, cond: ProductCondition?, verified: Boolean, delivery: Boolean, sort: SortOption) -> Unit,
    onReset: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var minPriceText by remember { mutableStateOf(initialFilter.minPrice?.toString() ?: "") }
    var maxPriceText by remember { mutableStateOf(initialFilter.maxPrice?.toString() ?: "") }
    var selectedCondition by remember { mutableStateOf(initialFilter.condition) }
    var verifiedOnly by remember { mutableStateOf(initialFilter.verifiedOnly) }
    var deliveryOnly by remember { mutableStateOf(initialFilter.deliveryOnly) }
    var selectedSort by remember { mutableStateOf(initialFilter.sortBy) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 10.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = LocalizationManager.getString("filter", language),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandNavy
                )
                OutlinedButton(
                    onClick = {
                        minPriceText = ""
                        maxPriceText = ""
                        selectedCondition = null
                        verifiedOnly = false
                        deliveryOnly = false
                        selectedSort = SortOption.NEWEST
                        onReset()
                    },
                    modifier = Modifier.testTag("filter_reset_btn")
                ) {
                    Text(LocalizationManager.getString("reset_filters", language), fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Sort Options
            Text(
                text = LocalizationManager.getString("sort_by", language),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    SortOption.NEWEST to "Newest",
                    SortOption.PRICE_LOW_HIGH to "Price: Low to High",
                    SortOption.PRICE_HIGH_LOW to "Price: High to Low",
                    SortOption.POPULAR to "Most Popular"
                ).forEach { (opt, label) ->
                    FilterChip(
                        selected = selectedSort == opt,
                        onClick = { selectedSort = opt },
                        label = { Text(label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandNavy,
                            selectedLabelColor = androidx.compose.ui.graphics.Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            // Price Range
            Text(
                text = LocalizationManager.getString("price", language),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = minPriceText,
                    onValueChange = { minPriceText = it },
                    label = { Text("Min Price") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f).testTag("min_price_input"),
                    singleLine = true
                )
                OutlinedTextField(
                    value = maxPriceText,
                    onValueChange = { maxPriceText = it },
                    label = { Text("Max Price") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f).testTag("max_price_input"),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            // Condition
            Text(
                text = LocalizationManager.getString("condition", language),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ProductCondition.entries.forEach { cond ->
                    val isSelected = selectedCondition == cond
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedCondition = if (isSelected) null else cond },
                        label = {
                            Text(LocalizationManager.getConditionString(cond, language), fontSize = 12.sp)
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandTeal,
                            selectedLabelColor = androidx.compose.ui.graphics.Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            // Toggles (Verified seller & Delivery)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(LocalizationManager.getString("verified_seller", language), fontWeight = FontWeight.Medium)
                Switch(checked = verifiedOnly, onCheckedChange = { verifiedOnly = it })
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(LocalizationManager.getString("delivery_available", language), fontWeight = FontWeight.Medium)
                Switch(checked = deliveryOnly, onCheckedChange = { deliveryOnly = it })
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Apply Button
            Button(
                onClick = {
                    val min = minPriceText.toDoubleOrNull()
                    val max = maxPriceText.toDoubleOrNull()
                    onApply(min, max, selectedCondition, verifiedOnly, deliveryOnly, selectedSort)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("filter_apply_btn"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandNavy)
            ) {
                Text(
                    text = LocalizationManager.getString("apply_filters", language),
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }

            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}
