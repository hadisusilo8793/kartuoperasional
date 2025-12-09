import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
class ErrorBoundaryComponent extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    toast.error(`Error: ${error.message}`);
  }
  private retry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
  public render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      return this.props.fallback(this.state.error, this.state.errorInfo, this.retry);
    }
    return this.props.children;
  }
}
export const ErrorBoundary = React.memo(ErrorBoundaryComponent);