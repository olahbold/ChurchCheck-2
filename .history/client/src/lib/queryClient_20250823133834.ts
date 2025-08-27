import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    try {
      const text = await res.text();
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: res.statusText };
    }
    
    // Create an error object that preserves the response data
    const error = new Error(errorData.error || `HTTP ${res.status}`);
    // Add additional properties from the error response
    Object.assign(error, errorData);
    throw error;
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const { method = 'GET', body, headers = {} } = options || {};
  
  // Get auth token from localStorage for SaaS authentication
  const authToken = localStorage.getItem('auth_token');
  
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...headers,
    },
    body,
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get auth token from localStorage for SaaS authentication
    const authToken = localStorage.getItem('auth_token');
    const res = await fetch(queryKey.join("/") as string, {
      headers: {
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// import { QueryClient, QueryFunction } from "@tanstack/react-query";

// function readExtendedTokenAndRotate(res: Response) {
//   const xt = res.headers.get('X-Extended-Token');
//   if (xt) {
//     try { localStorage.setItem('auth_token', xt); } catch {}
//   }
// }

// async function parseJsonSafe(res: Response) {
//   const text = await res.text();
//   if (!text) return null;
//   try { return JSON.parse(text); } catch { return { raw: text }; }
// }

// function buildError(res: Response, data: any) {
//   const message =
//     data?.error ||
//     data?.message ||
//     (typeof data?.raw === 'string' ? data.raw : null) ||
//     `HTTP ${res.status}`;
//   const err: any = new Error(message);
//   err.status = res.status;
//   if (data && typeof data === 'object') {
//     // preserve backend shape: { code, details, errorId, ... }
//     Object.assign(err, data);
//   }
//   return err;
// }

// async function assertOk(res: Response) {
//   if (!res.ok) {
//     const data = await parseJsonSafe(res);
//     throw buildError(res, data);
//   }
// }

// export async function apiRequest(
//   url: string,
//   options?: {
//     method?: string;
//     body?: string;
//     headers?: Record<string, string>;
//   }
// ): Promise<any> {
//   const { method = 'GET', body, headers = {} } = options || {};
//   const authToken = localStorage.getItem('auth_token');

//   const res = await fetch(url, {
//     method,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
//       ...headers,
//     },
//     body,
//     credentials: 'include',
//   });

//   // rotate kiosk token if server extended it
//   readExtendedTokenAndRotate(res);

//   await assertOk(res);

//   // success: parse body (may be empty)
//   const data = await parseJsonSafe(res);
//   return data;
// }

// type UnauthorizedBehavior = "returnNull" | "throw";

// export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
//   ({ on401 }) =>
//   async ({ queryKey }) => {
//     const authToken = localStorage.getItem('auth_token');
//     const url = queryKey.join("/") as string;

//     const res = await fetch(url, {
//       headers: {
//         ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
//       },
//       credentials: "include",
//     });

//     // rotate kiosk token if provided
//     readExtendedTokenAndRotate(res);

//     if (on401 === "returnNull" && res.status === 401) {
//       return null as T;
//     }

//     await assertOk(res);

//     const data = await parseJsonSafe(res);
//     return data as T;
//   };

// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       queryFn: getQueryFn({ on401: "throw" }),
//       refetchInterval: false,
//       refetchOnWindowFocus: false,
//       staleTime: Infinity,
//       retry: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });
