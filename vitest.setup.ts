import '@testing-library/jest-dom'

// Stub required env vars so SDK singletons can be imported without throwing
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_dummy'
