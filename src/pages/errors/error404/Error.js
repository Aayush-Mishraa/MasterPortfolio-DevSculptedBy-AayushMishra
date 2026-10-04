import React, { Component } from "react";
import { Helmet } from "react-helmet";
import Header from "../../../components/header/Header";
import CreativeFooter from "../../../components/CreativeFooter/CreativeFooter";
import TopButton from "../../../components/topButton/TopButton";
import "./Error.css";
import { Link } from "react-router-dom";

export default class Error extends Component {
  render() {
    const path = (this.props.location && this.props.location.pathname) || "/";
    return (
      <div className="error-main">
        <Header theme={this.props.theme} />
        {/* After the header, so this title wins over the header's SEO tags;
            noindex keeps unknown URLs out of search results (the server answers 200) */}
        <Helmet>
          <title>Page not found · Aayush Mishra</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <main className="error-class" id="main-content">
          <p className="error-req">
            <span>GET</span> {path} <b>404</b>
          </p>
          <h1 className="error-title">Page not found</h1>
          <p className="error-lead">
            There's no page at this address. It may have moved, or the link may have a typo. Start again from one of
            these:
          </p>
          <div className="error-actions">
            <Link className="error-btn error-btn--primary" to="/">
              Back to home
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link className="error-btn" to="/services">
              Services
            </Link>
            <Link className="error-btn" to="/work">
              Work
            </Link>
            <Link className="error-btn" to="/contact">
              Contact
            </Link>
          </div>
        </main>
        <CreativeFooter theme={this.props.theme} />
        <TopButton theme={this.props.theme} />
      </div>
    );
  }
}
