import React, { Component } from "react";
import "./Organizations.css";
import { Fade } from "react-reveal";
import OrganizationList from "../../components/organizationList/OrganizationList";
import AnimatedOrganizations from "../../components/animatedOrganizations/AnimatedOrganizations";
import OrganizationsData from "../../shared/opensource/organizations.json";

class Organizations extends Component {
  render() {
    const theme = this.props.theme;
    return (
      <div id="organizations">
        {/* New Animated Organizations Section */}
        <AnimatedOrganizations theme={theme} />
        
        {/* Original Organizations Section (if there's data) */}
        {OrganizationsData.data && OrganizationsData.data.length > 0 && (
          <>
            <div className="organizations-header-div">
              <Fade bottom duration={2000} distance="20px">
                <h1 className="organizations-header" style={{ color: theme.text }}>
                  Other Organizations
                </h1>
              </Fade>
            </div>
            <OrganizationList logos={OrganizationsData["data"]} />
          </>
        )}
      </div>
    );
  }
}

export default Organizations;
