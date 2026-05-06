import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>
            ⚠
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1e293b',
            margin: '0 0 8px 0',
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '0 0 24px 0',
            maxWidth: '400px',
            lineHeight: 1.5,
          }}>
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #1e4270, #0f2540)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              minWidth: '120px',
              minHeight: '44px',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
