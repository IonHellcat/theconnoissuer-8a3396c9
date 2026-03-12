import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">
                {this.props.fallbackTitle ?? "Something went wrong"}
              </h2>
              <p className="text-sm text-muted-foreground font-body mb-6">
                {this.state.error?.message || "An unexpected error occurred. Please try again."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Try again
                </Button>
                <Button onClick={() => window.location.assign("/")} variant="outline">
                  Go home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
