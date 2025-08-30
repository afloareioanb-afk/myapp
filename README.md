# SRE Readiness Questionnaire

A shareable web application that functions as a comprehensive SRE (Site Reliability Engineering) readiness assessment questionnaire. Built with modern web technologies and designed for cross-browser compatibility, including macOS Safari.

## Features

- **Shareable Links**: All answers are stored in URL parameters, making it easy to share filled questionnaires
- **Auto-save**: Changes are automatically saved to the URL
- **Drill-down Logic**: Conditional questions appear based on previous answers
- **Progress Tracking**: Visual progress bar and completion percentage
- **Onboarding Metrics**: Calculated percentages for Frontend, Backend, and APIs with Monitor/Alert splits
- **Export Options**: JSON and CSV export functionality
- **Responsive Design**: Works on desktop and mobile devices
- **Safari Compatible**: Optimized for macOS Safari browser

## Key Technical Features

- **URL-based State Management**: Entire questionnaire state stored in URL parameters
- **Dynamic UI Rendering**: Questions and sections built dynamically based on schema
- **Conditional Display**: Drill-down sections only show when relevant
- **Real-time Calculations**: Onboarding percentages update automatically
- **Cross-browser Compatibility**: Polyfills and fallbacks for older browsers

## Browser Support

| Browser | Version | Status |
|---------|---------|---------|
| Chrome | 60+ | ✅ Full Support |
| Firefox | 55+ | ✅ Full Support |
| Safari | 12+ | ✅ Full Support |
| Edge | 79+ | ✅ Full Support |
| IE | 11 | ⚠️ Limited Support |

## Safari Compatibility

The application has been specifically optimized for macOS Safari with:

- Webkit prefixes for CSS properties
- Polyfills for older Safari versions
- Fallback implementations for modern APIs
- iOS-specific meta tags
- Safari-compatible file downloads

### Testing Safari Compatibility

Use the included `safari-test.html` file to test Safari compatibility:

1. Open `safari-test.html` in Safari
2. Review the test results for each category
3. Run interactive tests to verify functionality
4. Check for any failed tests that may need attention

## Quick Start

### Local Development

1. Clone or download the project files
2. Open `index.html` in your web browser
3. Start filling out the questionnaire

### Deployment

The application is a static web app that can be deployed to any web hosting service:

#### GitHub Pages
1. Create a new repository
2. Upload the project files
3. Enable GitHub Pages in repository settings
4. Access via `https://username.github.io/repository-name`

#### Netlify
1. Drag and drop the project folder to Netlify
2. Get instant deployment with a shareable URL
3. Configure custom domain if needed

#### Vercel
1. Import the project to Vercel
2. Automatic deployment on every push
3. Global CDN and edge functions support

#### AWS S3 + CloudFront
1. Upload files to S3 bucket
2. Configure CloudFront distribution
3. Set S3 bucket as origin
4. Access via CloudFront URL

## Questionnaire Structure

### Application Metadata
- Application name
- PO Name
- Application type (Java, Node.js, Other)

### Location Selection
- GCP
- On-Premises
- Hybrid

### Capability Assessment (per location)
For each selected location, assess:

#### Frontend Component
- Monitoring (New Relic, Splunk)
- Alerting (New Relic, Splunk)
- Reporting
- Stip Integration

#### Backend Services
- Monitoring (New Relic, Splunk)
- Alerting (New Relic, Splunk)
- Reporting
- Stip Integration

#### Exposed APIs
- Monitoring (New Relic, Splunk)
- Alerting (New Relic, Splunk)
- Reporting
- Stip Integration

### SLO/SLA Assessment
- SLO/SLA structure existence
- Latency SLO
- Availability SLO
- Error budget definition
- SRE support needs

### Disaster Recovery
- DR plan documentation
- RTO/RPO definition
- Testing frequency
- SRE support needs

### Best Practices
- Runbooks and support guides
- Critical failure documentation
- Alert noise management
- MTTR tracking

## Monitoring & Alerting Options

### New Relic
- **Monitoring**: APM (dashboard), INFRA (dashboard)
- **Alerting**: Availability, Error rate

### Splunk
- **Monitoring**: Response times, HTTP Response Codes, Error Rate, Throughput, Availability, Anomalies, DB connections, Restarts/Uptime
- **Alerting**: Critical errors, Error Rate

## Onboarding Metrics

The application calculates "onboarding" percentages for each capability:

- **Green (≥80%)**: Well-established SRE practices
- **Orange (20-79%)**: Partial implementation
- **Red (<20%)**: Needs significant SRE investment

Metrics are calculated separately for:
- Overall capability onboarding
- Monitoring-specific onboarding
- Alerting-specific onboarding

## Export Formats

### JSON Export
Complete questionnaire data in structured JSON format, suitable for:
- Data analysis
- Integration with other systems
- Backup and restore

### CSV Export
Flattened questionnaire data in CSV format, suitable for:
- Spreadsheet analysis
- Reporting tools
- Data import to other systems

## Troubleshooting

### Common Safari Issues

1. **File Downloads Not Working**
   - Ensure Safari allows downloads from the site
   - Check Safari Security preferences
   - Try using the fallback download method

2. **CSS Not Rendering Properly**
   - Clear Safari cache and cookies
   - Check if JavaScript is enabled
   - Verify webkit prefixes are supported

3. **JavaScript Errors**
   - Check Safari Console for error messages
   - Ensure polyfills are loading correctly
   - Verify Safari version compatibility

### General Issues

1. **Progress Bar Not Updating**
   - Refresh the page
   - Check browser console for errors
   - Verify all required elements are present

2. **Export Functions Not Working**
   - Check browser console for errors
   - Ensure popup blockers are disabled
   - Try different export format

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly in multiple browsers
5. Submit a pull request

### Code Style

- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Test Safari compatibility for new features

### Testing Checklist

- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Test on mobile devices
- [ ] Verify export functionality
- [ ] Check responsive design
- [ ] Validate URL state management

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues, questions, or contributions:
1. Check the troubleshooting section
2. Review browser compatibility table
3. Test with safari-test.html
4. Open an issue in the repository

---

**Note**: This application is designed for internal SRE assessments and should be deployed in appropriate security contexts based on your organization's requirements.


