'use client';

export const UNAUTHORIZED_EVENT = 'home-budget:unauthorized';

/**
 * 401 응답 시 전역 잠금 이벤트를 발생시키는 fetch 래퍼
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
  return response;
}
