import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { ChefHat, Lock, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input } from "@/components/shared-ui";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isLoggingIn, user, isLoading } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <Redirect to="/" />;

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg("");
    try {
      await login({ data });
    } catch (err: any) {
      setErrorMsg("Invalid credentials. Please check and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden selection:bg-primary/30">
      {/* Abstract Background Image via requirements.yaml */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Premium Dark Wave Background" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background z-0" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl"
        >
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-xl shadow-accent/20 mb-6">
              <ChefHat className="w-8 h-8 text-black" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">Sign in to DEFFIZZY Cloud ERP</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  {...register("username")} 
                  className="pl-11 h-14 text-base" 
                  placeholder="Enter your username"
                  error={errors.username?.message}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  type="password" 
                  {...register("password")} 
                  className="pl-11 h-14 text-base" 
                  placeholder="Enter your password"
                  error={errors.password?.message}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-14 text-base mt-4" isLoading={isLoggingIn}>
              Sign In to System
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground/60 font-mono">DEFFIZZY BAKE V1.0</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
