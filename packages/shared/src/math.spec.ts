import { describe, it, expect } from 'vitest'
import { sum } from './math'

describe('sum', () => {
  it('should add two numbers', () => {
    expect(sum(2, 2)).toEqual(4)
  })

  it('should handle multiple numbers', () => {
    expect(sum(1, 2, 3)).toEqual(6)
  })

  it('should handle single number', () => {
    expect(sum(5)).toEqual(5)
  })

  it('should handle no arguments', () => {
    expect(sum()).toEqual(0)
  })
})