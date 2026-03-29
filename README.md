# AI Interest-Based Japanese Learning App

## Overview
This app helps users learn Japanese based on their interests (e.g., Judo, Anime, Cooking).
AI generates relevant vocabulary, example sentences, and lessons, which are stored in Firestore.
The app teaches users using flashcards, quizzes, and spaced repetition.

## Features
- Interest-based vocabulary
- AI-generated example sentences
- Flashcards & quizzes
- Spaced Repetition System (SRS)
- Progress tracking
- Firebase backend

## Tech Stack
- Flutter (Mobile App)
- Firebase Auth
- Firestore Database
- Firebase Functions
- GROQ API
- Firebase Cloud Messaging

## Firestore Structure
users/{userId}
  interests: []
  level: string

vocabulary/{category}/{wordId}
  kanji: string
  hiragana: string
  meaning: string
  example: string
  jlpt_level: string

progress/{userId}/{wordId}
  correct: number
  wrong: number
  next_review: timestamp

## App Flow
1. User selects interests
2. AI generates vocabulary
3. Save to Firestore
4. User learns via flashcards & quizzes
5. SRS schedules reviews
6. Track progress

## MVP
- Login/signup
- Select interest
- Generate 20 AI words
- Flashcards
- Quiz
- Review system

## Goal
Make Japanese learning personalized and relevant using AI.