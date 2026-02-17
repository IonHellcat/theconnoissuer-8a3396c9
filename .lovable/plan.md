

# The Connoisseur — Cigar Lounge & Shop Discovery Platform

## Overview
A premium, mobile-first web app that helps cigar enthusiasts discover the best lounges and shops wherever they travel. Dark, luxurious aesthetic with warm amber/gold accents.

---

## Phase 1: Foundation & Design System

- Set up the luxury dark theme: charcoal (#1a1a1a), amber/gold (#D4A853), cream (#F5F0E8)
- Import Playfair Display (headings) and Inter (body) fonts
- Configure smooth page transitions and animations
- Build responsive navigation (top navbar + mobile hamburger menu)
- Build the footer (About, Contact, Add a Lounge, social links)

## Phase 2: Landing / Home Page

- Full-screen moody hero section with headline, subheadline, and a prominent central search bar
- "Popular Cities" section with 6-8 beautifully styled city cards (Dubai, London, New York, Havana, Miami, Madrid, Hong Kong, Istanbul)
- Each card shows city name, image, and lounge count
- Search bar supports city, country, or lounge name queries

## Phase 3: Backend Setup (Supabase / Lovable Cloud)

- **Database tables**: lounges, reviews, profiles, cities
- **Storage bucket** for venue photos
- **Authentication**: Email + Google sign-in
- **RLS policies** so users can only edit their own reviews/profiles
- **Seed data**: ~5 lounges per city for Dubai, London, New York, Miami, and Havana with realistic details (names, descriptions, features, ratings)

## Phase 4: Search Results / City Page

- List view of lounges/shops with rich cards showing: name, type tag, star rating, description, address, price tier, and feature tags (Outdoor Terrace, Full Bar, Walk-in Humidor, etc.)
- Filter bar: type (Lounge/Shop/Both), vibe, features, "Open Now" toggle
- Map view toggle with pins for each venue (using a free map library)
- Smooth transitions between list and map views

## Phase 5: Individual Lounge/Shop Page

- Hero image with venue name, rating, price tier overlay
- Full description, contact details, hours, "Get Directions" link
- Features/amenities displayed as elegant tags
- "Cigar Selection Highlights" section
- Photo gallery grid
- Reviews section with rating breakdown bar chart and individual review cards
- "Write a Review" button (triggers modal, requires login)

## Phase 6: Reviews & Authentication

- Clean, dark-themed sign-up/login screens (email + Google)
- Write a Review modal: star rating, review text, optional cigar smoked, optional drink pairing, photo upload
- Reviews appear on lounge pages with user name, date, rating, and text

## Phase 7: User Profile & Cigar Passport

- Profile page with avatar, name, join date
- "Cigar Passport" — visual display of cities/countries visited
- Review history list
- Stats: lounges visited count, cities explored count

## Phase 8: Polish & Performance

- Lazy loading for all images
- Smooth scroll animations and hover effects
- Mobile responsiveness pass on all pages
- Fast search experience — goal: "landed in Dubai" to "know where I'm going" in under 30 seconds

