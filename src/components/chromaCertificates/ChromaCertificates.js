import React, { Component } from "react";
import "./ChromaCertificates.css";
import { Fade } from "react-reveal";
import { certifications } from "../../portfolio";
import SimpleChromaGrid from "../simpleChromaGrid/SimpleChromaGrid";

class ChromaCertificates extends Component {
  convertCertificatesToChromaItems = () => {
    return certifications.certifications.map((cert, index) => {
      // Color mapping for gradients based on certificate providers
      const getGradientAndBorder = (logoPath, colorCode) => {
        const baseColor = colorCode.replace('99', '').replace('ff', '');
        
        // Define gradient patterns based on certificate providers
        if (logoPath.includes('aws') || logoPath.includes('amazon')) {
          return {
            borderColor: "#FF9900",
            gradient: "linear-gradient(145deg, #FF9900, #232F3E)"
          };
        } else if (logoPath.includes('google') || logoPath.includes('gcp')) {
          return {
            borderColor: "#4285F4",
            gradient: "linear-gradient(135deg, #4285F4, #34A853, #EA4335, #FBBC05)"
          };
        } else if (logoPath.includes('ibm')) {
          return {
            borderColor: "#1F70C1",
            gradient: "linear-gradient(180deg, #1F70C1, #000)"
          };
        } else if (logoPath.includes('microsoft') || logoPath.includes('playwright')) {
          return {
            borderColor: "#00A4EF",
            gradient: "linear-gradient(210deg, #00A4EF, #000)"
          };
        } else if (logoPath.includes('deeplearning') || logoPath.includes('coursera')) {
          return {
            borderColor: "#0056D2",
            gradient: "linear-gradient(165deg, #0056D2, #000)"
          };
        } else if (logoPath.includes('selenium')) {
          return {
            borderColor: "#43B02A",
            gradient: "linear-gradient(195deg, #43B02A, #000)"
          };
        } else if (logoPath.includes('postman')) {
          return {
            borderColor: "#FF6C37",
            gradient: "linear-gradient(225deg, #FF6C37, #000)"
          };
        } else if (logoPath.includes('swift')) {
          return {
            borderColor: "#FA7343",
            gradient: "linear-gradient(160deg, #FA7343, #000)"
          };
        } else {
          // Default gradient for other certificates
          const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];
          const color = colors[index % colors.length];
          return {
            borderColor: color,
            gradient: `linear-gradient(${145 + (index * 30)}deg, ${color}, #000)`
          };
        }
      };

      const { borderColor, gradient } = getGradientAndBorder(cert.logo_path, cert.color_code);

      // Create certificate image URL
      let imageUrl;
      try {
        imageUrl = require(`../../assets/images/${cert.logo_path}`);
      } catch (error) {
        // Fallback to a default certificate icon
        imageUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNDI4NUY0Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5DZXJ0aWZpY2F0ZTwvdGV4dD4KPC9zdmc+";
      }

      return {
        image: imageUrl,
        certTitle: "Certificate", // Add certificate title
        title: cert.title,
        subtitle: cert.subtitle,
        handle: cert.alt_name,
        location: "Click to view certificate",
        borderColor: borderColor,
        gradient: gradient,
        url: cert.certificate_link && cert.certificate_link !== "Link to your certificate" ? cert.certificate_link : null
      };
    });
  };

  render() {
    const theme = this.props.theme;
    const chromaItems = this.convertCertificatesToChromaItems();

    return (
      <div className="main" id="certs">
        <div className="certs-header-div">
          <Fade bottom duration={2000} distance="20px">
            <h1 className="certs-header" style={{ color: theme.text }}>
              Certifications
            </h1>
            <p className="certs-subtitle" style={{ color: theme.secondaryText }}>
              Professional certifications and achievements in technology and development
            </p>
          </Fade>
        </div>
        <div className="chroma-certs-container">
          <Fade bottom duration={2000} distance="20px">
            <div style={{ minHeight: '800px', position: 'relative' }}>
              <SimpleChromaGrid 
                items={chromaItems}
                radius={280}
                columns={3}
                className="certificates-grid"
              />
            </div>
          </Fade>
        </div>
      </div>
    );
  }
}

export default ChromaCertificates;
