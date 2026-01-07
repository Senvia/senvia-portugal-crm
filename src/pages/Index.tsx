import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard - will be auth-gated later
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-xl gradient-senvia" />
        <p className="mt-4 text-muted-foreground">A carregar...</p>
      </div>
    </div>
  );
};

export default Index;
