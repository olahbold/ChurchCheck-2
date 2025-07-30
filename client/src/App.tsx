import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

// Import pages
import LandingPage from '@/pages/landing';
import RegisterPage from '@/pages/register';
import LoginPage from '@/pages/login';
import SubscriptionPage from '@/pages/subscription';
import Home from '@/pages/home';
import UserManagementDemo from '@/pages/user-management-demo';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <Router>
          <Switch>
            {/* Public routes */}
            <Route path="/" component={LandingPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/login" component={LoginPage} />
            
            {/* SaaS management routes */}
            <Route path="/subscription" component={SubscriptionPage} />
            
            {/* Demo pages */}
            <Route path="/user-management-demo" component={UserManagementDemo} />
            
            {/* Protected app routes - redirect to original app for now */}
            <Route path="/dashboard" component={Home} />
            <Route path="/checkin" component={Home} />
            <Route path="/member" component={Home} />
            <Route path="/history" component={Home} />
            <Route path="/followup" component={Home} />
            <Route path="/settings" component={Home} />
            <Route path="/admin" component={Home} />
            
            {/* Fallback */}
            <Route>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">Page not found</p>
                  <a href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    Go back to homepage
                  </a>
                </div>
              </div>
            </Route>
          </Switch>
        </Router>
        <Toaster />
    </QueryClientProvider>
  );
}

export default App;