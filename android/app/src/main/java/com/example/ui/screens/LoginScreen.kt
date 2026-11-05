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
import androidx.compose.ui.Alignment
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
fun LoginScreen(
    viewModel: MarketplaceViewModel,
    onSignedIn: () -> Unit,
    onNavigateToSignUp: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var method by remember { mutableStateOf(AuthMethod.PHONE) }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var dialCode by remember { mutableStateOf("252") }
    var password by remember { mutableStateOf("") }
    val loading by viewModel.authLoading.collectAsState()
    val error by viewModel.authError.collectAsState()

    val byPhone = method == AuthMethod.PHONE
    val identifier = if (byPhone) phone.trim() else email.trim()

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
            text = "Welcome back",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = BrandNavy
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Sign in to save favorites, message sellers and manage your listings.",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(28.dp))

        AuthMethodPicker(method = method, onMethodChange = { method = it })
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
            label = "Password"
        )

        // Reaching the reset needs the address, and the person has usually
        // just typed it -- so the button stays disabled until they have, and
        // uses what is in the field rather than asking again on another screen.
        //
        // A phone account has nowhere to send a link, so it says so instead of
        // offering a button that could only fail.
        if (byPhone) {
            Text(
                text = "Keep this password safe \u2014 a phone account cannot be reset by email.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.End).padding(top = 8.dp)
            )
        } else {
            TextButton(
                onClick = { viewModel.requestPasswordReset(email) },
                enabled = !loading && email.isNotBlank(),
                modifier = Modifier.align(Alignment.End)
            ) {
                Text("Forgot your password?", fontSize = 13.sp)
            }
        }

        if (error != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = error ?: "", color = ErrorRed, fontSize = 13.sp)
        }

        Spacer(modifier = Modifier.height(20.dp))
        Button(
            onClick = {
                if (byPhone) viewModel.signInWithPhone(phone, dialCode, password, onSignedIn)
                else viewModel.signIn(email, password, onSignedIn)
            },
            enabled = !loading && identifier.isNotBlank() && password.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = BrandTeal),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            if (loading) {
                CircularProgressIndicator(modifier = Modifier.height(20.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Sign In", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        TextButton(onClick = onNavigateToSignUp, modifier = Modifier.fillMaxWidth()) {
            Text("Don't have an account? Sign up")
        }
        TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
            Text("Continue browsing without an account", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
