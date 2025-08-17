import React, { Component } from "react";
import "./Certifications.css";
import { Fade } from "react-reveal";
import { certifications } from "../../portfolio";
import ChromaCertificates from "../../components/chromaCertificates/ChromaCertificates";

class Certifications extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <ChromaCertificates theme={theme} />
    );
  }
}

export default Certifications;
