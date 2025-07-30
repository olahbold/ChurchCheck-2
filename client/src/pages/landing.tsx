import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Church, Users, Calendar, BarChart3, Shield, Zap, Clock, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Users,
      title: "Member Management",
      description: "Comprehensive member profiles with family linking and contact management"
    },
    {
      icon: Shield,
      title: "Biometric Check-in",
      description: "Advanced fingerprint scanning for secure and fast attendance tracking"
    },
    {
      icon: Calendar,
      title: "Attendance Tracking",
      description: "Real-time attendance monitoring with historical data and analytics"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Detailed reports and insights to understand your congregation better"
    },
    {
      icon: Zap,
      title: "Automated Follow-up",
      description: "Smart notifications for member engagement and pastoral care"
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Live dashboard updates and instant notifications"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$19",
      period: "/month",
      description: "Perfect for small churches getting started",
      features: [
        "Up to 100 members",
        "Manual check-in",
        "Basic attendance tracking",
        "Single admin user",
        "CSV exports"
      ],
      buttonText: "Start Free Trial",
      popular: false
    },
    {
      name: "Growth",
      price: "$49",
      period: "/month",
      description: "Ideal for growing congregations",
      features: [
        "Unlimited members",
        "Biometric fingerprint check-in",
        "Family check-in features",
        "Visitor management",
        "History tracking with calendar",
        "Follow-up queue management",
        "Basic reporting suite",
        "Multiple admin users (up to 5)",
        "Email notifications"
      ],
      buttonText: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "Complete solution for large churches",
      features: [
        "All Growth features",
        "Full reporting analytics",
        "Real-time email/SMS notifications",
        "Bulk member management",
        "Advanced user roles",
        "Multi-location support",
        "API access",
        "Custom church branding",
        "Priority support",
        "Unlimited admin users"
      ],
      buttonText: "Start Free Trial",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Church className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">ChurchConnect</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge className="mb-4 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
              30-Day Free Trial • All Features Included
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Modern Church Management
            <span className="block text-indigo-600 dark:text-indigo-400">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Streamline your church operations with advanced biometric attendance tracking, 
            comprehensive member management, and intelligent analytics. Built for churches of all sizes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Your Free Trial
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            No credit card required • Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything Your Church Needs
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Powerful features designed specifically for modern church administration and member engagement.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your church. Start with a 30-day free trial with full access to all features.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-indigo-500 scale-105' : 'border-gray-200 dark:border-gray-700'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-center justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                      {plan.buttonText}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-indigo-600 dark:bg-indigo-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Church Management?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join hundreds of churches already using ChurchConnect to streamline their operations 
            and better serve their communities.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-50 text-lg px-8 py-3">
              Start Your 30-Day Free Trial
              <CheckCircle className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-indigo-200 mt-4">
            Full access to all features • No setup fees • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <Church className="h-8 w-8 text-indigo-400" />
            <span className="text-xl font-bold text-white">ChurchConnect</span>
          </div>
          <div className="text-center text-gray-400">
            <p>&copy; 2025 ChurchConnect. All rights reserved.</p>
            <p className="mt-2">Built with ❤️ for churches worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;