# Jewish Mapped - Find Jewish Institutions Across America

A beautiful, Zillow-inspired web application for discovering Jewish institutions, synagogues, schools, and educational programs throughout the United States.

## Features

- **AI-Powered Search**: Describe what you're looking for in plain English and get intelligent results
- **Multiple Search Options**: 
  - Search by ZIP code
  - Browse by category (Synagogues, Schools, Youth Programs, etc.)
  - Filter by religious affiliation (Reform, Conservative, Orthodox, etc.)
- **Personalized Recommendations**: Cookie-based recommendations tailored to your interests
- **Comprehensive Database**: Access to detailed information about Jewish institutions nationwide
- **Mobile-Responsive Design**: Beautiful interface that works on all devices

## Quick Start

### Option 1: Python Server (Recommended)
```bash
# Navigate to the project directory
cd "Jewish Mapped"

# Start the server
python3 -m http.server 8000

# Open your browser and visit:
# http://localhost:8000
```

### Option 2: Node.js Server
```bash
# Install dependencies
npm install

# Start the server
npm start

# Open your browser and visit:
# http://localhost:8000
```

### Option 3: Direct File Access
Simply open `index.html` in your web browser. Note: Some features may be limited due to CORS restrictions.

## How to Use

### AI Search
1. Use the main search bar at the top of the page
2. Describe what you're looking for in natural language:
   - "Orthodox synagogue with youth programs near Manhattan"
   - "Reform temple with Hebrew school"
   - "Chabad house with family programming"
3. Get intelligent, scored results based on your query

### Search by ZIP Code
1. Click the "Search by Zip Code" tab
2. Enter a 5-digit ZIP code
3. View all Jewish institutions in that area

### Browse by Category
1. Click the "Search by Category" tab
2. Choose from:
   - Synagogues
   - Jewish Schools
   - Youth Programs
   - Education Programs
   - Campus Hillel
   - Community Centers

### Filter by Affiliation
1. Click the "Search by Affiliation" tab
2. Select from major Jewish movements:
   - Reform
   - Conservative
   - Orthodox
   - Reconstructionist
   - Chabad
   - Pluralistic

### Personalized Recommendations
The "Might Interest You" section shows institutions based on your browsing preferences, which are stored locally and update based on your interactions.

## Data Structure

The application uses a comprehensive JSON database (`US institution DB.json`) containing:

- **Institution Details**: Names, addresses, phone numbers, websites
- **Religious Affiliation**: Denomination and movement information
- **Educational Programs**: Hebrew schools, adult education, youth groups
- **Special Features**: Online services, family programs, seasonal events
- **Geographic Coverage**: ZIP code-based organization for easy location searches

## Technology Stack

- **Frontend**: HTML5, CSS3, Modern JavaScript (ES6+)
- **Styling**: Custom CSS with Flexbox and Grid layouts
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Open Sans)
- **Data**: JSON-based database
- **Responsive Design**: Mobile-first approach

## Future Enhancements

- **Real ChatGPT Integration**: Replace simulated AI with actual OpenAI API
- **Geolocation Services**: GPS-based "near me" searches
- **User Accounts**: Save favorites and personalized preferences
- **Interactive Maps**: Visual location displays
- **Reviews and Ratings**: Community-driven feedback system
- **Event Calendar**: Upcoming programs and services
- **Advanced Filters**: Age groups, languages, accessibility features

## Contributing

We welcome contributions to improve Jewish Mapped! Areas where help is needed:

- Data accuracy and updates
- Additional search features
- Mobile app development
- Accessibility improvements
- Translation support

## Data Sources

The database includes information from:
- Synagogue websites and directories
- Jewish federation listings
- Hillel campus organizations
- Jewish educational institutions
- Community-submitted information

## Privacy & Cookies

- User preferences are stored locally using localStorage
- No personal data is transmitted to external servers
- Search queries are processed locally for privacy

## Support

For questions, suggestions, or technical support:
- Email: support@jewishmapped.org
- GitHub Issues: [Create an issue](https://github.com/your-username/jewish-mapped/issues)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Jewish Mapped** - Connecting Jewish communities across America 🕎 