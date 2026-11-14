import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b pb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to ZIST
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Shield className="h-5 w-5" />
            <span>Privacy Policy</span>
          </div>
        </div>

        <div className="space-y-6 prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy for ZIST</h1>
          <p className="text-muted-foreground text-sm">Last updated: November 15, 2026</p>

          <p>
            Welcome to ZIST (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). At ZIST, accessible from{" "}
            <strong>https://zist-media.netlify.app</strong>, the privacy of our visitors and users is one of
            our main priorities. This Privacy Policy document outlines the types of information that is
            collected and recorded by ZIST and how we use it.
          </p>

          <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
          <p>When you register and use ZIST, we may collect the following personal and activity data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account Information:</strong> When you register via email, we collect your email address,
              first name, last name, and display name. Your password is encrypted and securely stored using
              industry-standard hashing algorithms.
            </li>
            <li>
              <strong>Google Account Information:</strong> If you choose to sign in using Google OAuth, we
              request access only to basic profile information (<code>openid</code>, <code>email</code>, and{" "}
              <code>profile</code>). We collect your Google user ID, email address, name, and profile avatar.
              We do not request or access your Google Drive, contacts, emails, or other sensitive Google data.
            </li>
            <li>
              <strong>User Content &amp; Media Activity:</strong> Media items you track (such as movies, TV
              shows, books), vocabulary words saved, generated quotes, themes, quizzes, and learning progress.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">2. How We Use Your Information</h2>
          <p>We use the information we collect in the following ways:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide, operate, and maintain our educational tracking application.</li>
            <li>To authenticate you and keep your session secure.</li>
            <li>To generate personalized study material, quizzes, and vocabulary insights using AI.</li>
            <li>To understand how users interact with our features and improve user experience.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">3. Google User Data Policy &amp; Compliance</h2>
          <p>
            ZIST&apos;s use and transfer to any other app of information received from Google APIs will adhere
            to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>
            We <strong>do not sell, rent, or trade</strong> your Google account data or personal information
            to third parties or advertising brokers. We do not use user data to train generalized public AI
            models.
          </p>

          <h2 className="text-xl font-semibold mt-6">4. Data Storage and Security</h2>
          <p>
            Your information is stored in secure database environments using encrypted connections (SSL/TLS).
            Access tokens and authentication sessions are guarded by cryptographically signed JSON Web Tokens (JWT).
          </p>

          <h2 className="text-xl font-semibold mt-6">5. Your Data Rights &amp; Deletion</h2>
          <p>
            You have the right to access, update, or delete your personal information at any time. If you wish to
            delete your account and all associated tracked media, vocabulary, and quiz data from our servers, you
            may submit a request to us and your data will be permanently wiped within 7 business days.
          </p>

          <h2 className="text-xl font-semibold mt-6">6. Third-Party Services</h2>
          <p>ZIST integrates with the following third-party APIs solely to provide media information and AI insights:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Google OAuth 2.0 (Identity authentication)</li>
            <li>Google Gemini API (Educational content generation)</li>
            <li>The Movie Database (TMDb) (Movie and TV metadata)</li>
            <li>OpenLibrary (Book metadata)</li>
            <li>Wikipedia API (General reference summaries)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">7. Contact Us</h2>
          <p>
            If you have any questions or suggestions about our Privacy Policy or data handling practices, please
            contact us directly at:
          </p>
          <p className="font-medium text-primary">
            Email: <a href="mailto:support@zist.app" className="underline">support@zist.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
