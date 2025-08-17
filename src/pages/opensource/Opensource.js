import React, { Component } from "react";
import Header from "../../components/header/Header";
import CreativeFooter from "../../components/CreativeFooter/CreativeFooter";
import OpensourceCharts from "../../containers/opensourceCharts/OpensourceCharts";
import Organizations from "../../containers/organizations/Organizations";
import PullRequests from "../../containers/pullRequests/PullRequests";
import Issues from "../../containers/issues/Issues";
import Repositories from "../../containers/repositories/Repositories";
import TopButton from "../../components/topButton/TopButton";
import "./Opensource.css";

class Opensource extends Component {
  render() {
    return (
      <div className="opensource-main">
        <Header theme={this.props.theme} />
        <Organizations theme={this.props.theme} />
        <Repositories theme={this.props.theme} />
        <OpensourceCharts theme={this.props.theme} />
        <PullRequests theme={this.props.theme} />
        <Issues theme={this.props.theme} />
        <CreativeFooter theme={this.props.theme} />
        <TopButton theme={this.props.theme} />
      </div>
    );
  }
}

export default Opensource;
