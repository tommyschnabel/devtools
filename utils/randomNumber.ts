export type Language = 'typescript' | 'javascript' | 'csharp' | 'swift' | 'kotlin' | 'go' | 'rust';

export interface LanguageOption {
  language: Language;
  name: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { language: 'typescript', name: 'TypeScript' },
  { language: 'javascript', name: 'JavaScript' },
  { language: 'csharp', name: 'C#' },
  { language: 'swift', name: 'Swift' },
  { language: 'kotlin', name: 'Kotlin' },
  { language: 'go', name: 'Go' },
  { language: 'rust', name: 'Rust' },
];

/**
 * Generate a cryptographically secure random integer between min and max (inclusive)
 */
export function generateRandomNumber(min: number, max: number): number {
  // Ensure min is less than or equal to max
  if (min > max) {
    [min, max] = [max, min];
  }

  const range = max - min + 1;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  // Use modulo to get a number in the range
  const randomValue = array[0];
  if (randomValue === undefined) {
    throw new Error('Failed to generate random value');
  }
  return min + (randomValue % range);
}

/**
 * Generate code sample template for the specified language
 */
export function generateCodeTemplate(
  language: Language,
  min: number,
  max: number
): string {
  const templates: Record<Language, (min: number, max: number) => string> = {
    typescript: (min, max) => `function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Usage: Generate a random number between ${min} and ${max}
const randomNumber = getRandomNumber(${min}, ${max});
console.log(randomNumber);`,

    javascript: (min, max) => `function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Usage: Generate a random number between ${min} and ${max}
const randomNumber = getRandomNumber(${min}, ${max});
console.log(randomNumber);`,

    csharp: (min, max) => `using System;

int GetRandomNumber(int min, int max)
{
    Random random = new Random();
    return random.Next(min, max + 1);
}

// Usage: Generate a random number between ${min} and ${max}
int randomNumber = GetRandomNumber(${min}, ${max});
Console.WriteLine(randomNumber);`,

    swift: (min, max) => `import Foundation

func getRandomNumber(min: Int, max: Int) -> Int {
    return Int.random(in: min...max)
}

// Usage: Generate a random number between ${min} and ${max}
let randomNumber = getRandomNumber(min: ${min}, max: ${max})
print(randomNumber)`,

    kotlin: (min, max) => `import kotlin.random.Random

fun getRandomNumber(min: Int, max: Int): Int {
    return Random.nextInt(min, max + 1)
}

// Usage: Generate a random number between ${min} and ${max}
val randomNumber = getRandomNumber(${min}, ${max})
println(randomNumber)`,

    go: (min, max) => `package main

import (
    "fmt"
    "math/rand"
)

func getRandomNumber(min, max int) int {
    return rand.Intn(max-min+1) + min
}

// Usage: Generate a random number between ${min} and ${max}
func main() {
    randomNumber := getRandomNumber(${min}, ${max})
    fmt.Println(randomNumber)
}`,

    rust: (min, max) => `use rand::Rng;

fn get_random_number(min: i32, max: i32) -> i32 {
    let mut rng = rand::thread_rng();
    rng.gen_range(min..=max)
}

// Usage: Generate a random number between ${min} and ${max}
fn main() {
    let random_number = get_random_number(${min}, ${max});
    println!("{}", random_number);
}`,
  };

  return templates[language](min, max);
}
