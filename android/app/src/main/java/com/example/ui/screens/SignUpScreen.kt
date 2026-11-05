package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.example.ui.components.AuthMethod
import com.example.ui.components.AuthMethodPicker
import com.example.ui.components.PasswordField
import com.example.ui.components.PhoneNumberField
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.theme.ErrorRed
import com.example.ui.viewmodel.MarketplaceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpScreen(
    viewModel: MarketplaceViewModel,
    onSignedUp: () -> Unit,
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    var method by remember { mutableStateOf(AuthMethod.PHONE) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var dialCode by remember { mutableStateOf("252") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    val loading by viewModel.authLoading.collectAsState()
    val error by viewModel.authError.collectAsState()
    val passwordsMatch = password == confirmPassword

    val byPhone = method == AuthMethod.PHONE
    val identifier = if (byPhone) phone.trim() else email.trim()
    // The API asks for eight on a phone account; GoTrue's own floor is six.
    val longEnough = if (byPhone) password.length >= 8 else password.length >= 6

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            // Scrollable, because the form is taller than a short screen once
            // the keyboard is up -- without this the button at the bottom
            // could not be reached at all.
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Create your account",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = BrandNavy
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Join Magan Market to buy, sell and message sellers directly.",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(28.dp))

        AuthMethodPicker(method = method, onMethodChange = { method = it })
        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            label = { Text("Your name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(14.dp))

        if (byPhone) {
            PhoneNumberField(
                phone = phone,
                onPhoneChange = { phone = it },
                dialCode = dialCode,
                onDialCodeChange = { dialCode = it }
            )
        } else {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth()
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        PasswordField(
            value = password,
            onValueChange = { password = it },
            label = if (byPhone) "Password (min 8 characters)" else "Password (min 6 characters)"
        )
        Spacer(modifier = Modifier.height(14.dp))
        PasswordField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            label = "Confirm password",
            isError = confirmPassword.isNotEmpty() && !passwordsMatch
        )

        if (error != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = error ?: "", color = ErrorRed, fontSize = 13.sp)
        }

        Spacer(modifier = Modifier.height(20.dp))
        Button(
            onClick = {
                if (byPhone) {
                    // Nothing to confirm afterwards: no code was sent and
                    // there is no inbox to check.
                    viewModel.signUpWithPhone(phone, dialCode, password, fullName, onSignedUp)
                } else {
                    viewModel.signUp(email, password, fullName, onSignedUp)
                }
            },
            enabled = !loading && identifier.isNotBlank() && fullName.isNotBlank() &&
                longEnough && passwordsMatch,
            colors = ButtonDefaults.buttonColors(containerColor = BrandTeal),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            if (loading) {
                CircularProgressIndicator(modifier = Modifier.height(20.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Create Account", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        TextButton(onClick = onNavigateToLogin, modifier = Modifier.fillMaxWidth()) {
            Text("Already have an account? Sign in")
        }
    }
}
