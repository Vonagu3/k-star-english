import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback: (error: Error, reset: () => void) => ReactNode; resetKey?: unknown };
type State = { error: Error | null; key: unknown };

/** Catches render errors so a broken task never leaves a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) { return { error }; }

  static getDerivedStateFromProps(props: Props, state: State) {
    // A new task (different resetKey) starts with a clean slate.
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('K-Star: task crashed', error, info.componentStack);
  }

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, () => this.setState({ error: null }));
    return this.props.children;
  }
}
