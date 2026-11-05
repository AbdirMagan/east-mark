package com.example.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
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
import com.example.data.local.DatabaseInitializer
import com.example.ui.theme.BrandTeal

/** Which credential a sign-in or sign-up form is asking for. */
enum class AuthMethod { PHONE, EMAIL }

/**
 * Phone or email.
 *
 * Phone leads because most buyers in these markets have one and many have no
 * email address at all. Both are offered on both screens, so nobody has to
 * invent an inbox to sell a goat.
 */
@Composable
fun AuthMethodPicker(
    method: AuthMethod,
    onMethodChange: (AuthMethod) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth().selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = method == AuthMethod.PHONE,
            onClick = { onMethodChange(AuthMethod.PHONE) },
            label = { Text("Phone", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) },
            leadingIcon = { Icon(Icons.Filled.Phone, contentDescription = null, modifier = Modifier.size(16.dp)) },
            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = BrandTeal.copy(alpha = 0.18f)),
            modifier = Modifier.weight(1f).testTag("auth_method_phone")
        )
        FilterChip(
            selected = method == AuthMethod.EMAIL,
            onClick = { onMethodChange(AuthMethod.EMAIL) },
            label = { Text("Email", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) },
            leadingIcon = { Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(16.dp)) },
            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = BrandTeal.copy(alpha = 0.18f)),
            modifier = Modifier.weight(1f).testTag("auth_method_email")
        )
    }
}

/**
 * A phone number, with its country beside it.
 *
 * The dial code is part of the credential, not decoration: "063 440 0000" is
 * a different number in Hargeisa and in Nairobi, and the server needs to know
 * which before it can turn what was typed into one canonical form.
 */
@Composable
fun PhoneNumberField(
    phone: String,
    onPhoneChange: (String) -> Unit,
    dialCode: String,
    onDialCodeChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    val countries = DatabaseInitializer.COUNTRIES

    Row(modifier = modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.height(56.dp).testTag("dial_code_btn")
            ) {
                Text("+$dialCode", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null, modifier = Modifier.size(18.dp))
            }

            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                countries.distinctBy { it.phonePrefix }.forEach { country ->
                    val digits = country.phonePrefix.filter { it.isDigit() }
                    DropdownMenuItem(
                        text = { Text("${country.flag} ${country.name} +$digits", fontSize = 13.sp) },
                        onClick = {
                            onDialCodeChange(digits)
                            expanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        OutlinedTextField(
            value = phone,
            onValueChange = onPhoneChange,
            label = { Text("Phone number") },
            placeholder = { Text("063 440 0000", color = MaterialTheme.colorScheme.onSurfaceVariant) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.weight(1f).testTag("phone_input")
        )
    }
}
