# Cloudflare Turnstile - Frontend Integration Guide

Quick guide to integrate Cloudflare Turnstile CAPTCHA in your frontend for the Number Verification flow.

## 1. Add Turnstile Script

Add this to your HTML `<head>` or Next.js layout:

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

Or for Next.js with Script component:

```tsx
import Script from 'next/script'

export default function Layout({ children }) {
  return (
    <>
      <Script 
        src="https://challenges.cloudflare.com/turnstile/v0/api.js" 
        strategy="lazyOnload" 
      />
      {children}
    </>
  )
}
```

## 2. Add Widget to Your Form

### HTML/Vanilla JS

```html
<form id="verification-form">
  <input type="tel" id="phoneNumber" placeholder="+33612345678" required />
  
  <!-- Turnstile widget container -->
  <div class="cf-turnstile" 
       data-sitekey="YOUR_SITE_KEY"
       data-callback="onTurnstileSuccess"></div>
  
  <button type="submit">Send Verification Code</button>
</form>

<script>
let turnstileToken = null;

function onTurnstileSuccess(token) {
  turnstileToken = token;
  console.log('CAPTCHA solved!');
}

document.getElementById('verification-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!turnstileToken) {
    alert('Please complete the CAPTCHA');
    return;
  }
  
  const phoneNumber = document.getElementById('phoneNumber').value;
  
  const response = await fetch('http://localhost:3003/verify/number', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber,
      captchaToken: turnstileToken
    })
  });
  
  const result = await response.json();
  if (result.ok && result.codeSent) {
    alert('Code sent! Check your SMS');
    // Show code input field
  }
});
</script>
```

### React/Next.js

```tsx
'use client'

import { useRef, useState } from 'react'

export default function VerificationForm() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<any>(null)

  const handleTurnstileLoad = () => {
    if (window.turnstile && turnstileRef.current) {
      window.turnstile.render(turnstileRef.current, {
        sitekey: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
        callback: (token: string) => {
          setTurnstileToken(token)
        }
      })
    }
  }

  const sendCode = async () => {
    if (!turnstileToken) {
      alert('Please complete the CAPTCHA')
      return
    }

    const response = await fetch('/api/verify/number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        captchaToken: turnstileToken
      })
    })

    const result = await response.json()
    if (result.ok && result.codeSent) {
      setStep('code')
      // Reset Turnstile for next request
      window.turnstile?.reset()
    }
  }

  const verifyCode = async () => {
    if (!turnstileToken) {
      alert('Please complete the CAPTCHA')
      return
    }

    const response = await fetch('/api/verify/number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        code,
        captchaToken: turnstileToken
      })
    })

    const result = await response.json()
    if (result.ok) {
      alert('Phone number verified!')
      // Redirect to eligibility check
    } else {
      alert('Invalid code')
    }
  }

  return (
    <div className="verification-form">
      {step === 'phone' ? (
        <>
          <h2>Enter Your Phone Number</h2>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+33612345678"
            pattern="\+[1-9]\d{1,14}"
            required
          />
          
          <div ref={turnstileRef} onLoad={handleTurnstileLoad} />
          
          <button onClick={sendCode}>Send Verification Code</button>
        </>
      ) : (
        <>
          <h2>Enter Verification Code</h2>
          <p>We sent a code to {phoneNumber}</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
          />
          
          <div ref={turnstileRef} onLoad={handleTurnstileLoad} />
          
          <button onClick={verifyCode}>Verify Code</button>
        </>
      )}
    </div>
  )
}
```

## 3. Environment Variables

Create `.env.local` in your frontend:

```properties
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your-turnstile-site-key-here
```

## 4. Widget Modes

Cloudflare Turnstile offers different modes:

### Managed (Recommended)
Automatically chooses challenge difficulty:
```html
<div class="cf-turnstile" 
     data-sitekey="YOUR_SITE_KEY"
     data-theme="light"></div>
```

### Non-Interactive
No visible challenge for most users:
```html
<div class="cf-turnstile" 
     data-sitekey="YOUR_SITE_KEY"
     data-appearance="interaction-only"></div>
```

### Invisible
Completely invisible, programmatic:
```html
<div class="cf-turnstile" 
     data-sitekey="YOUR_SITE_KEY"
     data-size="invisible"></div>
```

## 5. Styling

### Light Theme (Default)
```html
<div class="cf-turnstile" data-theme="light"></div>
```

### Dark Theme
```html
<div class="cf-turnstile" data-theme="dark"></div>
```

### Auto (Matches system preference)
```html
<div class="cf-turnstile" data-theme="auto"></div>
```

### Custom CSS
```css
.cf-turnstile {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}
```

## 6. Error Handling

```typescript
const verifyNumber = async (phoneNumber: string, captchaToken: string) => {
  try {
    const response = await fetch('/api/verify/number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, captchaToken })
    })

    if (!response.ok) {
      const error = await response.json()
      
      if (response.status === 401) {
        // CAPTCHA failed - reset and ask user to try again
        window.turnstile?.reset()
        throw new Error('CAPTCHA validation failed. Please try again.')
      }
      
      if (response.status === 400) {
        // Phone number invalid
        throw new Error(error.message || 'Invalid phone number format')
      }
      
      throw new Error('Server error')
    }

    return await response.json()
  } catch (error) {
    console.error('Verification error:', error)
    throw error
  }
}
```

## 7. Test Keys

Use these for development:

**Always Passes:**
```
NEXT_PUBLIC_CAPTCHA_SITE_KEY=1x00000000000000000000AA
```

**Always Fails:**
```
NEXT_PUBLIC_CAPTCHA_SITE_KEY=2x00000000000000000000AB
```

## 8. API Proxy (Optional)

If you want to hide your backend URL, create a Next.js API route:

```typescript
// app/api/verify/number/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const response = await fetch(`${process.env.BACKEND_URL}/verify/number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  const result = await response.json()
  return NextResponse.json(result, { status: response.status })
}
```

Then update your frontend to call `/api/verify/number` instead of the backend directly.

## 9. Complete Flow Example

```typescript
// 1. User enters phone number
// 2. User completes CAPTCHA
// 3. Frontend sends request to backend
const sendResult = await fetch('/api/verify/number', {
  method: 'POST',
  body: JSON.stringify({
    phoneNumber: '+33612345678',
    captchaToken: turnstileToken
  })
})
// 4. Backend validates CAPTCHA with Cloudflare
// 5. Backend sends SMS code via CAMARA API
// 6. User receives SMS
// 7. User enters code
// 8. User completes new CAPTCHA
// 9. Frontend sends verification request
const verifyResult = await fetch('/api/verify/number', {
  method: 'POST',
  body: JSON.stringify({
    phoneNumber: '+33612345678',
    code: '123456',
    captchaToken: newTurnstileToken
  })
})
// 10. Backend validates CAPTCHA + code
// 11. Success! Redirect to eligibility check
```

## Resources

- [Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Widget Configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [React Integration](https://developers.cloudflare.com/turnstile/recipes/react/)
- [Next.js Example](https://github.com/cloudflare/turnstile-demo-workers)
