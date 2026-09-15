package com.example.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BrandNavy

@Composable
fun ReportListingDialog(
    onDismiss: () -> Unit,
    onSubmit: (reason: String) -> Unit
) {
    val reportReasons = listOf(
        "Suspicious scam or fraud attempt",
        "Counterfeit or fake item",
        "Wrong pricing, description, or category",
        "Prohibited product (weapons, illegal goods)",
        "Offensive content or harassment",
        "Duplicate or spam listing"
    )

    var selectedReason by remember { mutableStateOf(reportReasons[0]) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = "Report This Listing", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        },
        text = {
            Column {
                Text(
                    text = "Help maintain a safe East African marketplace community. Please select a reason for reporting:",
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                reportReasons.forEach { reason ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedReason = reason }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = (selectedReason == reason),
                            onClick = { selectedReason = reason }
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = reason, fontSize = 13.sp)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedReason) },
                colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.testTag("submit_report_btn")
            ) {
                Text("Submit Report")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
