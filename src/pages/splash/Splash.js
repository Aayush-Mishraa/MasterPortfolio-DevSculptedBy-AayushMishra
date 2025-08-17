import React, { Component } from "react";
import "./Splash.css";
import { Redirect } from "react-router-dom";
import LoaderLogo from "../../components/Loader/LoaderLogo.js";

function AnimatedSplash(props) {
  return (
    <div className={`logo_wrapper ${props.isExiting ? 'fade-out' : 'fade-in'}`}>
      <div className={`screen ${props.isExiting ? 'screen-exit' : ''}`} style={{ backgroundColor: props.theme.splashBg }}>
        <LoaderLogo id="logo" theme={props.theme} />
      </div>
    </div>
  );
}

class Splash extends Component {
  constructor(props) {
    super(props);
    this.state = {
      redirect: false,
      isExiting: false,
    };
  }

  componentDidMount() {
    // Start exit animation at 5.5 seconds
    this.exitTimer = setTimeout(() => {
      this.setState({ isExiting: true });
    }, 5500);

    // Complete redirect at 6.5 seconds (after fade out)
    this.redirectTimer = setTimeout(() => {
      this.setState({ redirect: true });
    }, 6500);
  }

  componentWillUnmount() {
    clearTimeout(this.exitTimer);
    clearTimeout(this.redirectTimer);
  }

  render() {
    return this.state.redirect ? (
      <Redirect to="/home" />
    ) : (
      <AnimatedSplash theme={this.props.theme} isExiting={this.state.isExiting} />
    );
  }
}

export default Splash;
