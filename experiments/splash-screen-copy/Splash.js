import React, { Component } from "react";
import { Redirect } from "react-router-dom";
import ThreeOrbitSplash from "./ThreeOrbitSplash";

class Splash extends Component {
  constructor(props) {
    super(props);
    this.state = {
      redirect: false,
      isExiting: false,
    };
  }

  componentDidMount() {
    this.exitTimer = setTimeout(() => {
      this.setState({ isExiting: true });
    }, 2300);

    this.redirectTimer = setTimeout(() => {
      this.setState({ redirect: true });
    }, 3000);
  }

  componentWillUnmount() {
    clearTimeout(this.exitTimer);
    clearTimeout(this.redirectTimer);
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to="/home" />;
    }

    return <ThreeOrbitSplash theme={this.props.theme} isExiting={this.state.isExiting} />;
  }
}

export default Splash;
