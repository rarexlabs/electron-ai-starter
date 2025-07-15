import { Error, Ok, Result } from './types'

export function isOk<A, E>(result: Result<A, E>): result is Ok<A> {
  return result.status === 'ok'
}

export function isError<A, E>(result: Result<A, E>): result is Error<E> {
  return result.status === 'error'
}

export function ok<A>(value: A): Ok<A> {
  return { status: 'ok', value }
}

export function error<E>(error: E): Error<E> {
  return { status: 'error', error }
}
