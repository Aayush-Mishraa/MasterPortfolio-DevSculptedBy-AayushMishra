import React, { Component } from "react";
import "./AnimatedOrganizations.css";

// Tech company SVG logos for better quality and no dependency on external images
const TechLogos = {
  Google: ({ color = "#4285F4" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill={color} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  Microsoft: ({ color = "#00A4EF" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill={color} d="M13 1h10v10H13z"/>
      <path fill="#7FBA00" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  ),
  GitHub: ({ color = "currentColor" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill={color} d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  AWS: ({ color = "#FF9900" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill={color} d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.192 0 .088-.048.176-.152.272l-.503.335c-.072.048-.144.072-.208.072-.08 0-.16-.04-.239-.112-.112-.12-.208-.248-.288-.384-.08-.144-.16-.304-.256-.488-.64.757-1.44 1.135-2.4 1.135-.687 0-1.239-.2-1.663-.592-.423-.392-.632-.920-.632-1.576 0-.696.24-1.255.728-1.695.488-.44 1.135-.664 1.951-.664.272 0 .551.024.84.064.287.048.583.112.88.2v-.648c0-.68-.144-1.151-.424-1.447-.288-.296-.775-.448-1.463-.448-.315 0-.639.04-.968.112-.329.08-.647.184-.952.32-.144.063-.248.104-.32.128-.071.024-.127.032-.168.032-.144 0-.215-.104-.215-.32v-.504c0-.168.024-.296.08-.376.056-.08.16-.16.31-.24.968-.503 2.111-.752 3.431-.752 1.295 0 2.24.296 2.847.888.6.592.904 1.487.904 2.696v3.56zm-3.321 1.239c.264 0 .536-.048.824-.144.287-.096.543-.264.775-.496.144-.152.248-.32.32-.504.071-.184.112-.408.112-.672v-.32c-.231-.064-.479-.12-.735-.160-.256-.048-.504-.064-.744-.064-.536 0-.927.104-1.191.32-.264.216-.392.52-.392.927 0 .384.096.671.296.863.191.2.487.296.887.296v.016zm6.527.856c-.184 0-.31-.032-.391-.104-.08-.064-.151-.2-.215-.4L6.247 3.473c-.064-.2-.096-.335-.096-.415 0-.168.08-.256.247-.256h1.007c.191 0 .319.032.391.104.08.064.144.2.207.4l2.176 8.576 2.016-8.576c.056-.2.12-.335.199-.4.08-.072.215-.104.398-.104h.823c.191 0 .319.032.398.104.08.064.151.2.199.4l2.04 8.672 2.24-8.672c.064-.2.135-.335.207-.4.08-.072.207-.104.391-.104h.959c.168 0 .256.08.256.256 0 .056-.008.112-.024.176-.016.064-.048.151-.104.271l-3.12 9.967c-.064.2-.135.335-.215.4-.08.072-.207.104-.391.104h-.887c-.191 0-.319-.032-.398-.104-.08-.064-.151-.2-.199-.4l-2.008-8.384-1.983 8.384c-.056.2-.12.335-.199.4-.08.072-.215.104-.398.104h-.887z"/>
    </svg>
  ),
  Docker: ({ color = "#2496ED" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill={color} d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186H8.1a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185"/>
    </svg>
  ),
  React: ({ color = "#61DAFB" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <circle cx="12" cy="12" r="2" fill={color}/>
      <path fill={color} d="M12,1C18.5,1,20,4.22,20,4.22C20,4.22,18.5,7.45,12,7.45S4,4.22,4,4.22S5.5,1,12,1Z"/>
      <path fill={color} d="M12,16.55C18.5,16.55,20,19.78,20,19.78S18.5,23,12,23S4,19.78,4,19.78S5.5,16.55,12,16.55Z"/>
      <ellipse cx="12" cy="12" rx="8" ry="3" fill="none" stroke={color} strokeWidth="1"/>
      <ellipse cx="12" cy="12" rx="8" ry="3" fill="none" stroke={color} strokeWidth="1" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="8" ry="3" fill="none" stroke={color} strokeWidth="1" transform="rotate(120 12 12)"/>
    </svg>
  ),
  NodeJS: ({ color = "#339933" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill={color} d="M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.570,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z"/>
    </svg>
  ),
  Python: ({ color = "#3776ab" }) => (
    <svg viewBox="0 0 24 24" className="tech-logo-svg">
      <path fill={color} d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05z"/>
      <path fill="#FFD43B" d="M9.75 23.82l-.9-.2-.73-.26-.59-.3-.45-.32-.34-.34-.25-.34-.16-.33-.1-.3-.04-.26-.02-.2.01-.13V15.5l.05-.63.13-.55.21-.46.26-.38.3-.31.33-.25.35-.19.35-.14.33-.1.3-.07.26-.04.21-.02H15.23l.69-.05.59-.14.5-.22.41-.27.33-.32.27-.35.2-.36.15-.37.1-.35.07-.32.04-.27.02-.21v-3.06h2.09l.21.03.28.07.32.12.35.18.36.26.36.36.35.46.32.59.28.73.21.88.14 1.05.05 1.23-.06 1.22-.16 1.04-.24.87-.32.71-.36.57-.4.44-.42.33-.42.24-.4.16-.36.1-.32.05-.24.01h-.16l-.06-.01h-8.16v.83h5.84l.01 2.75.02.37-.05.34-.11.31-.17.28-.25.26-.31.23-.38.2-.44.18-.51.15-.58.12-.64.1-.71.06-.77.04-.84.02-1.27-.05z"/>
    </svg>
  )
};

class AnimatedOrganizations extends Component {
  render() {
    const theme = this.props.theme;
    
    const organizations = [
      { name: "Google", displayName: "Google" },
      { name: "Microsoft", displayName: "Microsoft" },
      { name: "GitHub", displayName: "GitHub" },
      { name: "AWS", displayName: "AWS" },
      { name: "Docker", displayName: "Docker" },
      { name: "React", displayName: "React" },
      { name: "NodeJS", displayName: "Node.js" },
      { name: "Python", displayName: "Python" }
    ];

    return (
      <div className="animated-organizations-container" 
           style={{ 
             '--theme-body': theme.body,
             '--theme-text': theme.text,
             '--theme-highlight': theme.highlight,
             '--theme-secondary': theme.secondaryText,
             '--theme-dark': theme.dark
           }}>
        <div className="animated-organizations-header">
          <h2 className="organizations-title" style={{ color: theme.text }}>
            Tech Partners
          </h2>
          <p className="organizations-subtitle" style={{ color: theme.secondaryText }}>
            Key collaborations
          </p>
        </div>
        
        <div className="organizations-slider">
          <div className="organizations-track">
            {/* First set of logos */}
            {organizations.map((org, index) => {
              const LogoComponent = TechLogos[org.name];
              return (
                <div key={`${org.name}-1`} className="organization-card">
                  <div className="organization-logo-container">
                    {LogoComponent ? (
                      <LogoComponent color={theme.text} />
                    ) : (
                      <div className="logo-placeholder" style={{ backgroundColor: theme.highlight, color: theme.dark }}>
                        {org.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="organization-name" style={{ color: theme.text }}>
                    {org.displayName}
                  </span>
                </div>
              );
            })}
            {/* Second set for seamless looping */}
            {organizations.map((org, index) => {
              const LogoComponent = TechLogos[org.name];
              return (
                <div key={`${org.name}-2`} className="organization-card">
                  <div className="organization-logo-container">
                    {LogoComponent ? (
                      <LogoComponent color={theme.text} />
                    ) : (
                      <div className="logo-placeholder" style={{ backgroundColor: theme.highlight, color: theme.dark }}>
                        {org.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="organization-name" style={{ color: theme.text }}>
                    {org.displayName}
                  </span>
                </div>
              );
            })}
            {/* Third set for extra smooth animation */}
            {organizations.map((org, index) => {
              const LogoComponent = TechLogos[org.name];
              return (
                <div key={`${org.name}-3`} className="organization-card">
                  <div className="organization-logo-container">
                    {LogoComponent ? (
                      <LogoComponent color={theme.text} />
                    ) : (
                      <div className="logo-placeholder" style={{ backgroundColor: theme.highlight, color: theme.dark }}>
                        {org.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="organization-name" style={{ color: theme.text }}>
                    {org.displayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}

export default AnimatedOrganizations;
