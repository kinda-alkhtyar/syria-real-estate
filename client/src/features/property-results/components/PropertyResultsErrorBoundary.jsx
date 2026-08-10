import { Component } from 'react'

import ResultState from './ResultState.jsx'

/**
 * Converts genuine render failures in the results experience into recovery UI.
 */
export default class PropertyResultsErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-canvas py-16">
          <div className="mx-auto w-full max-w-3xl px-4">
            <ResultState
              onAction={() => this.setState({ hasError: false })}
              type="error"
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
