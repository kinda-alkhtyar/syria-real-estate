import { Component } from 'react'

import PropertyDetailsState from './PropertyDetailsState.jsx'

export default class PropertyDetailsErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <PropertyDetailsState
          onRetry={() => this.setState({ hasError: false })}
          type="error"
        />
      )
    }
    return this.props.children
  }
}
