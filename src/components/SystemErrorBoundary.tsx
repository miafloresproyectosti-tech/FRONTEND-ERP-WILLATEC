import { Component, type ErrorInfo, type ReactNode } from "react";

import SystemStatusPage from "./SystemStatusPage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class SystemErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en la interfaz del ERP", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <SystemStatusPage kind="server-error" />;
    }

    return this.props.children;
  }
}
