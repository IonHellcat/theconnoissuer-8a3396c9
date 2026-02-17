import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const AuthPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: { display_name: signupName.trim() || undefined },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent a verification link to confirm your account." });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
      setShowForgot(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-sm mx-auto px-4">
            <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">Reset Password</h1>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email" className="font-body text-sm">Email</Label>
                <Input id="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="bg-secondary border-border/50" />
              </div>
              <Button type="submit" disabled={loading} className="w-full font-body">{loading ? "Sending..." : "Send Reset Link"}</Button>
              <button type="button" onClick={() => setShowForgot(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body w-full text-center">
                Back to login
              </button>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-sm mx-auto px-4">
          <h1 className="font-display text-2xl font-bold text-gradient-gold text-center mb-8">Welcome</h1>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="login" className="font-body">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="font-body">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="login-email" className="font-body text-sm">Email</Label>
                  <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label htmlFor="login-password" className="font-body text-sm">Password</Label>
                  <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <Button type="submit" disabled={loading} className="w-full font-body">{loading ? "Logging in..." : "Log In"}</Button>
                <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body w-full text-center">
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="signup-name" className="font-body text-sm">Display Name</Label>
                  <Input id="signup-name" type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="bg-secondary border-border/50" placeholder="Optional" />
                </div>
                <div>
                  <Label htmlFor="signup-email" className="font-body text-sm">Email</Label>
                  <Input id="signup-email" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label htmlFor="signup-password" className="font-body text-sm">Password</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <Button type="submit" disabled={loading} className="w-full font-body">{loading ? "Creating account..." : "Sign Up"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
