import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, DollarSign, Receipt, TrendingUp, Upload, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="w-4/5 mx-auto px-4 py-6">
        <nav className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">FinanceTracker</span>
          </div>
          <div className="space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="w-4/5 mx-auto px-4 py-16 text-center">
        <div className="w-full">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Smart Receipt Tracking Made Simple
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            Upload receipts, automatically extract transaction data with AI, and take control of your finances. 
            No more manual data entry.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="text-lg px-8 py-3">
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-3">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-4 lg:gap-8 mb-16 w-full">
            <Card className="text-center">
              <CardHeader>
                <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Smart Receipt Upload</CardTitle>
                <CardDescription>
                  Simply upload or drag & drop your receipts. Our AI automatically extracts all transaction details.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Instant Processing</CardTitle>
                <CardDescription>
                  Powered by AWS Textract for 95%+ accuracy. Get structured data in seconds, not minutes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Financial Insights</CardTitle>
                <CardDescription>
                  Track spending patterns, categorize expenses, and gain insights into your financial habits.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Benefits Section */}
          <div className="bg-card rounded-xl p-6 lg:p-8 mb-16 w-full">
            <h2 className="text-3xl font-bold mb-8">Why Choose FinanceTracker?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">OCR Technology</h3>
                  <p className="text-muted-foreground">Advanced AI extracts store names, dates, items, and totals automatically</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Manual Control</h3>
                  <p className="text-muted-foreground">Review and edit extracted data before saving. You stay in control</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Multiple Formats</h3>
                  <p className="text-muted-foreground">Support for images (JPG, PNG) and PDF receipts</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Secure & Private</h3>
                  <p className="text-muted-foreground">Your financial data is encrypted and secure</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to simplify your finances?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users who have automated their expense tracking
            </p>
            <Button size="lg" asChild className="text-lg px-8 py-3">
              <Link href="/register">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 w-full">
        <div className="w-4/5 mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 FinanceTracker. Built with Next.js and ❤️</p>
        </div>
      </footer>
    </div>
  );
}
