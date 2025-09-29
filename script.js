// Global variables
console.log('Script.js is loading...');
let institutionsData = {};
let allInstitutions = [];

// OpenAI API configuration
// Note: In production, use environment variables or a secure config file
// For client-side apps, consider using a backend proxy to hide the API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE'; // Set your OpenAI API key in environment variables
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Load the JSON data
async function loadInstitutionsData() {
    try {
        const response = await fetch('USinstitutionDB.json');
        institutionsData = await response.json();
        
        // Flatten the data for easier searching
        allInstitutions = [];
        for (const zipCode in institutionsData) {
            institutionsData[zipCode].forEach(institution => {
                allInstitutions.push({
                    ...institution,
                    zipCode: zipCode
                });
            });
        }
        
        // Load initial recommendations
        loadRecommendations();
        
        console.log(`Loaded ${allInstitutions.length} institutions from ${Object.keys(institutionsData).length} zip codes`);
    } catch (error) {
        console.error('Error loading institutions data:', error);
    }
}

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load data
    loadInstitutionsData();
    
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Clear search inputs when switching away from tabs
            const currentActiveTab = document.querySelector('.tab-btn.active');
            if (currentActiveTab) {
                const currentTabId = currentActiveTab.getAttribute('data-tab');
                
                // Clear AI search input when switching away from AI tab
                if (currentTabId === 'ai' && tabId !== 'ai') {
                    clearAISearchInput();
                }
                
                // Clear zip code input when switching away from zip code tab
                if (currentTabId === 'zipcode' && tabId !== 'zipcode') {
                    clearZipcodeInput();
                }
            }
            
            // Remove active class from all tabs and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            this.classList.add('active');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });
    
    // AI Search functionality
    const aiSearchBtn = document.getElementById('aiSearchBtn');
    const aiSearchInput = document.getElementById('aiSearchInput');
    
    aiSearchBtn.addEventListener('click', handleAISearch);
    aiSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAISearch();
        }
    });
    
    // Zipcode search enter key
    const zipcodeInput = document.getElementById('zipcodeInput');
    zipcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchByZipcode();
        }
    });
});

// AI Search Handler with OpenAI integration
async function handleAISearch() {
    const query = document.getElementById('aiSearchInput').value.trim();
    if (!query) return;
    
    // Check if API key is configured
    if (OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        alert('Please configure your OpenAI API key in the script.js file to use AI search.');
        return;
    }
    
    showLoading();
    
    try {
        // Get AI-powered search results from the web
        console.log('Starting AI web search...');
        const webResults = await getAISearchResults(query);
        console.log('Raw AI results:', webResults);
        
        // Convert AI results to our format
        const formattedWebResults = formatAIResultsForDisplay(webResults);
        console.log('Formatted web results:', formattedWebResults);
        
        // Also search local database for relevant results
        console.log('Searching local database...');
        const localResults = await searchLocalDatabaseWithAI(query);
        console.log('Local database results:', localResults);
        
        // Combine both result sets
        const combinedResults = [...formattedWebResults, ...localResults];
        console.log('Combined results:', combinedResults);
        
        if (combinedResults && combinedResults.length > 0) {
            displayResults(combinedResults, "");
        } else {
            // No results found from either source
            displayResults([], "No results found");
        }
        
    } catch (error) {
        console.error('AI Search error:', error);
        alert(`AI Search failed: ${error.message}. Please check your API key and try again.`);
        
        // Fallback to simulated search if API fails
        console.log('Falling back to simulated AI search...');
        const results = simulateAISearch(query);
        displayResults(results, "Search Results (Offline Mode)");
    }
    
    hideLoading();
    scrollToResults();
}

// Get AI-powered search results from the web using OpenAI
async function getAISearchResults(userQuery) {
    const systemPrompt = `You are an AI assistant that helps users find Jewish institutions and programs. Provide ONLY a valid JSON response with real Jewish institutions that match the user's criteria.

CRITICAL: Your response must be ONLY valid JSON, no additional text, explanations, or markdown formatting.

JSON format required:
{
    "institutions": [
        {
            "name": "Full institution name",
            "denomination": "Reform/Conservative/Orthodox/Chabad/Reconstructionist/Pluralistic/etc",
            "address": "Complete address with city, state, zip",
            "phone": "Phone number if known, null if unknown",
            "website": "Website URL if known, null if unknown",
            "programs": {
                "Hebrew School": "Yes/No/Unknown",
                "Youth Groups": "Yes/No/Unknown", 
                "Adult Education": "Yes/No/Unknown",
                "Family and Intergenerational Learning": "Yes/No/Unknown",
                "Preschool": "Yes/No/Unknown",
                "Senior Programs": "Yes/No/Unknown"
            },
            "description": "Brief description of the institution"
        }
    ]
}

Requirements:
- Provide real, existing institutions only
- Include synagogues, temples, Jewish community centers, Hillel houses, Jewish schools
- Return 8-12 institutions when possible
- Prioritize institutions in specified locations
- All information must be accurate to your knowledge
- Response must be pure JSON only`;

    const userMessage = `Find Jewish institutions and programs based on this request: "${userQuery}"

Please provide real institutions that match this criteria, including their contact information, programs offered, and denominations.`;

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo', // Using GPT-3.5-turbo which is more reliable
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.1, // Lower temperature for more factual responses
            max_tokens: 2000 // More tokens for comprehensive results
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response format');
    }
    
    const aiResponse = data.choices[0].message.content.trim();
    
    try {
        // Clean the response - remove any markdown formatting or extra text
        let cleanedResponse = aiResponse.trim();
        
        // Look for JSON content between ```json markers
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            cleanedResponse = jsonMatch[1];
        }
        
        // If response starts with explanation text, try to find just the JSON part
        if (!cleanedResponse.startsWith('{')) {
            const jsonStart = cleanedResponse.indexOf('{');
            if (jsonStart !== -1) {
                cleanedResponse = cleanedResponse.substring(jsonStart);
            }
        }
        
        // Parse the JSON response from AI
        const results = JSON.parse(cleanedResponse);
        console.log('AI Search Results:', results);
        
        // Handle different response formats
        if (results.institutions) {
            return results.institutions;
        } else if (Array.isArray(results)) {
            return results;
        } else {
            return [results];
        }
    } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.log('Raw AI Response:', aiResponse);
        
        // Try to extract institution information from text response
        return parseTextualResponse(aiResponse, userQuery);
    }
}

// Parse textual response when JSON parsing fails
function parseTextualResponse(textResponse, userQuery) {
    console.log('Parsing textual response as fallback...');
    const institutions = [];
    const lines = textResponse.split('\n');
    
    let currentInstitution = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Look for institution names (various patterns)
        if (trimmedLine.match(/^\d+\.|\-\s*[A-Z]/) || 
            trimmedLine.includes('Synagogue') || 
            trimmedLine.includes('Temple') || 
            trimmedLine.includes('Chabad') || 
            trimmedLine.includes('Hillel') ||
            trimmedLine.includes('Jewish') ||
            trimmedLine.match(/^[A-Z][a-zA-Z\s&]+(?:Synagogue|Temple|Center|House|School)/)) {
            
            // Save previous institution if exists
            if (currentInstitution && currentInstitution.name) {
                institutions.push(currentInstitution);
            }
            
            // Start new institution
            currentInstitution = {
                name: trimmedLine.replace(/^\d+\.\s*|\-\s*|\*/g, '').trim(),
                denomination: 'Not specified',
                address: 'Address to be confirmed',
                phone: null,
                website: null,
                programs: {
                    'Adult Education': 'Unknown',
                    'Youth Groups': 'Unknown',
                    'Hebrew School': 'Unknown'
                },
                description: 'Information provided by AI search'
            };
        } else if (currentInstitution && trimmedLine) {
            // Add information to current institution
            if (trimmedLine.toLowerCase().includes('address') || 
                trimmedLine.match(/\d+.*(?:street|avenue|road|blvd|st|ave|rd)/i)) {
                currentInstitution.address = trimmedLine.replace(/^address:?\s*/i, '').trim();
            } else if (trimmedLine.toLowerCase().includes('phone') || 
                      trimmedLine.match(/\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/)) {
                currentInstitution.phone = trimmedLine.replace(/^phone:?\s*/i, '').trim();
            } else if (trimmedLine.toLowerCase().includes('website') || 
                      trimmedLine.match(/https?:\/\/[^\s]+/) ||
                      trimmedLine.includes('www.')) {
                currentInstitution.website = trimmedLine.replace(/^website:?\s*/i, '').trim();
            } else if (trimmedLine.toLowerCase().includes('reform') || 
                      trimmedLine.toLowerCase().includes('conservative') || 
                      trimmedLine.toLowerCase().includes('orthodox') || 
                      trimmedLine.toLowerCase().includes('chabad') ||
                      trimmedLine.toLowerCase().includes('reconstructionist')) {
                currentInstitution.denomination = trimmedLine.trim();
            } else if (trimmedLine.length > 20) {
                // Likely a description
                currentInstitution.description = trimmedLine.trim();
            }
        }
    }
    
    // Add the last institution
    if (currentInstitution && currentInstitution.name) {
        institutions.push(currentInstitution);
    }
    
    console.log(`Parsed ${institutions.length} institutions from text`);
    return institutions.slice(0, 12); // Limit results
}

// Format AI results to match our existing institution format
function formatAIResultsForDisplay(aiResults) {
    return aiResults.map(institution => {
        return {
            'Synagogue Name': institution.name || 'Unknown Institution',
            'Denomination': institution.denomination || 'Not specified',
            'Full Address': institution.address || 'Address not provided',
            'Phone Number': institution.phone || null,
            'Website': institution.website || null,
            'Educational Programs': institution.programs || {},
            'AI_Description': institution.description || '',
            'Source': 'AI Web Search'
        };
    });
}

// Search local database with AI-enhanced relevance scoring
async function searchLocalDatabaseWithAI(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    // Check if institutions are loaded
    if (!allInstitutions || allInstitutions.length === 0) {
        console.log('No local institutions loaded yet');
        return [];
    }
    
    // Extract location information from query
    const locationInfo = extractLocationFromQuery(query);
    console.log('Extracted location info:', locationInfo);
    
         // If a specific location is mentioned, use AI to filter by proximity
     if (locationInfo.hasSpecificLocation) {
         console.log('Filtering by specific location using AI proximity check:', locationInfo);
         
         // Get institutions that might be relevant and check proximity with AI
         const potentialResults = await filterInstitutionsByProximity(allInstitutions, locationInfo.locations);
         
         if (potentialResults.length === 0) {
             console.log('No local database results found within driving distance');
             return [];
         }
         
         // Score the proximity-filtered results
         potentialResults.forEach(institution => {
            let score = 20; // Base score for being in the right location
            
            // Extract key search terms from the query (excluding location terms)
            const searchTerms = extractSearchTerms(query).filter(term => 
                !locationInfo.locations.some(loc => loc.toLowerCase().includes(term.toLowerCase()))
            );
            
            // Score based on search terms
            searchTerms.forEach(term => {
                const termLower = term.toLowerCase();
                const institutionText = JSON.stringify(institution).toLowerCase();
                
                // High score for exact matches in name
                if (institution['Synagogue Name'] && typeof institution['Synagogue Name'] === 'string' && institution['Synagogue Name'].toLowerCase().includes(termLower)) {
                    score += 15;
                }
                
                // Medium score for denomination matches
                if (institution.Denomination && typeof institution.Denomination === 'string' && institution.Denomination.toLowerCase().includes(termLower)) {
                    score += 12;
                }
                
                // Lower score for general content matches
                if (institutionText.includes(termLower)) {
                    score += 3;
                }
            });
            
            // Boost score for program-specific queries
            const programs = institution['Educational Programs'] || {};
            if (queryLower.includes('teen') || queryLower.includes('youth') || queryLower.includes('teenager')) {
                if (programs['Youth Groups'] && typeof programs['Youth Groups'] === 'string' && programs['Youth Groups'].toLowerCase().includes('yes')) {
                    score += 15; // Higher score for teen programs
                }
            }
            
            if (queryLower.includes('kid') || queryLower.includes('child') || queryLower.includes('children')) {
                if (programs['Youth Groups'] && typeof programs['Youth Groups'] === 'string' && programs['Youth Groups'].toLowerCase().includes('yes')) {
                    score += 12;
                }
                if (programs['Hebrew School'] && typeof programs['Hebrew School'] === 'string' && programs['Hebrew School'].toLowerCase().includes('yes')) {
                    score += 12;
                }
            }
            
            if (queryLower.includes('weekly') || queryLower.includes('regular') || queryLower.includes('ongoing')) {
                // Programs that meet weekly are more relevant
                if (programs['Youth Groups'] && typeof programs['Youth Groups'] === 'string' && programs['Youth Groups'].toLowerCase().includes('yes')) {
                    score += 8;
                }
            }
            
            results.push({ 
                institution: {
                    ...institution,
                    'Source': 'Local Database'
                }, 
                score 
            });
                 });
         
         // Sort by relevance score and return top results
         return results
             .sort((a, b) => b.score - a.score)
             .slice(0, 6) // Limit local results
             .map(result => result.institution);
     }
     
     // If no specific location mentioned, return empty array to avoid showing irrelevant results
     console.log('No specific location found in query, not showing local database results');
     return [];
}

// AI-powered proximity filtering function
async function filterInstitutionsByProximity(institutions, searchLocations) {
    if (!institutions || institutions.length === 0) {
        return [];
    }
    
    // Prepare institution addresses for AI analysis
    const institutionList = institutions.map((inst, index) => ({
        index: index,
        name: inst['Synagogue Name'] || 'Unknown',
        address: inst['Full Address'] || 'Address not available'
    }));
    
    const searchLocation = searchLocations[0]; // Use the first/primary location
    
    try {
        console.log(`Checking proximity to ${searchLocation} for ${institutionList.length} institutions...`);
        
                 const proximityPrompt = `You are a geographic proximity analyzer. Given a search location and a list of institution addresses, determine which institutions are within a reasonable driving distance (maximum 1 hour drive) from the search location.

CRITICAL: Only consider the ACTUAL CITY and STATE in addresses, NOT street names. For example:
- "California Street, Omaha, NE" is in Nebraska, NOT California
- "Texas Avenue, New York, NY" is in New York, NOT Texas
- Only look at the city and state portion after the street address

Search Location: "${searchLocation}"

Institution List:
${institutionList.map(inst => `${inst.index}: ${inst.name} - ${inst.address}`).join('\n')}

Respond with ONLY a JSON array of the index numbers for institutions that are within 1 hour driving distance of the search location. Consider traffic and realistic driving times. IGNORE street names that might contain state or city names - only use the actual city, state portion of addresses.

Examples:
- Davis, California search should ONLY include institutions actually located in California cities, NOT institutions on "California Street" in other states
- Houston, TX search should include nearby Texas suburbs like Katy, Sugar Land, Pearland, but NOT Dallas, Austin, or Amarillo
- New York search should include nearby areas in NY/NJ/CT but NOT institutions on "New York Avenue" in other states

Response format: [0, 3, 7, 12] (just the index numbers of nearby institutions)`;

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: proximityPrompt }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            console.error('Proximity check failed, falling back to basic filtering');
            return basicProximityFilter(institutions, searchLocations);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        
        try {
            // Parse the AI response
            const nearbyIndices = JSON.parse(aiResponse);
            console.log('AI proximity results:', nearbyIndices);
            
            if (Array.isArray(nearbyIndices)) {
                const nearbyInstitutions = nearbyIndices
                    .filter(index => index >= 0 && index < institutions.length)
                    .map(index => institutions[index]);
                
                console.log(`AI filtered to ${nearbyInstitutions.length} nearby institutions`);
                return nearbyInstitutions;
            }
        } catch (parseError) {
            console.error('Error parsing AI proximity response:', parseError);
        }
        
    } catch (error) {
        console.error('AI proximity check failed:', error);
    }
    
    // Fallback to basic filtering if AI fails
    return basicProximityFilter(institutions, searchLocations);
}

// Basic fallback proximity filter
function basicProximityFilter(institutions, searchLocations) {
    console.log('Using basic proximity filter as fallback');
    
    const searchLocation = searchLocations[0].toLowerCase();
    const results = [];
    
    for (const institution of institutions) {
        const address = (institution['Full Address'] || '').toLowerCase();
        let isNearby = false;
        
        // Extract city and state from address (ignore street names)
        const cityStateMatch = extractCityStateFromAddress(address);
        
        // Very strict basic filtering based on actual city/state, not street names
        if (searchLocation.includes('davis') && searchLocation.includes('california')) {
            isNearby = cityStateMatch.includes('davis') && cityStateMatch.includes('california');
        } else if (searchLocation.includes('california') || searchLocation.includes('ca')) {
            isNearby = cityStateMatch.includes('california') || cityStateMatch.includes(', ca');
        } else if (searchLocation.includes('houston')) {
            isNearby = (cityStateMatch.includes('houston') || 
                       (cityStateMatch.includes('texas') && 
                        (cityStateMatch.includes('katy') || cityStateMatch.includes('sugar land') || 
                         cityStateMatch.includes('pearland') || cityStateMatch.includes('spring') ||
                         cityStateMatch.includes('woodlands')))) &&
                      cityStateMatch.includes('texas');
        } else if (searchLocation.includes('new york') || searchLocation.includes('nyc')) {
            isNearby = (cityStateMatch.includes('new york') || cityStateMatch.includes('manhattan') ||
                       cityStateMatch.includes('brooklyn') || cityStateMatch.includes('queens') ||
                       cityStateMatch.includes('bronx') || cityStateMatch.includes('staten island')) &&
                      (cityStateMatch.includes('new york') || cityStateMatch.includes(', ny'));
        } else if (searchLocation.includes('los angeles')) {
            isNearby = (cityStateMatch.includes('los angeles') || cityStateMatch.includes('santa monica') ||
                       cityStateMatch.includes('beverly hills') || cityStateMatch.includes('west hollywood')) &&
                      cityStateMatch.includes('california');
        } else {
            // For other cities, require exact city match in city/state portion
            isNearby = cityStateMatch.includes(searchLocation);
        }
        
        if (isNearby) {
            results.push(institution);
        }
    }
    
    console.log(`Basic filter found ${results.length} nearby institutions`);
    return results.slice(0, 10); // Limit results
}

// Extract city and state portion from full address, ignoring street names
function extractCityStateFromAddress(fullAddress) {
    // Common address format: "Street Address, City, State Zip"
    // We want to extract everything after the first comma (city, state, zip)
    
    const parts = fullAddress.split(',');
    if (parts.length >= 2) {
        // Take everything after the first comma (skip street address)
        const cityStatePortion = parts.slice(1).join(',').trim();
        return cityStatePortion.toLowerCase();
    }
    
    // Fallback if no comma found - return the whole address
    return fullAddress.toLowerCase();
}

// Extract location information from user query
function extractLocationFromQuery(query) {
    const queryLower = query.toLowerCase();
    const locations = [];
    let hasSpecificLocation = false;
    
    // Common location patterns
    const locationPatterns = [
        // Cities
        /(?:in|near|around|from)\s+([a-z\s]+?)(?:\s|,|$)/gi,
        // State abbreviations
        /\b([a-z]{2})\b/gi,
        // Zip codes
        /\b(\d{5}(?:-\d{4})?)\b/g,
        // "I live in..." pattern
        /(?:live|located|am)\s+in\s+([a-z\s]+?)(?:\s|,|and|$)/gi
    ];
    
         // Known cities and states
     const knownLocations = [
         'houston', 'dallas', 'austin', 'san antonio', 'texas', 'tx',
         'trenton', 'princeton', 'new jersey', 'nj',
         'new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx',
         'philadelphia', 'philly', 'pennsylvania', 'pa',
         'boston', 'cambridge', 'massachusetts', 'ma',
         'chicago', 'illinois', 'il',
         'los angeles', 'la', 'san francisco', 'california', 'ca',
         'miami', 'orlando', 'tampa', 'florida', 'fl',
         'atlanta', 'georgia', 'ga',
         'washington', 'dc', 'maryland', 'md', 'virginia', 'va',
         'seattle', 'washington state', 'wa',
         'denver', 'colorado', 'co',
         'phoenix', 'arizona', 'az',
         'las vegas', 'nevada', 'nv'
     ];
    
    // Check for explicit location mentions
    knownLocations.forEach(location => {
        if (queryLower.includes(location)) {
            locations.push(location);
            hasSpecificLocation = true;
        }
    });
    
    // Extract from patterns
    locationPatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern);
        while ((match = regex.exec(queryLower)) !== null) {
            const location = match[1]?.trim();
            if (location && location.length > 1) {
                locations.push(location);
                hasSpecificLocation = true;
            }
        }
    });
    
    return {
        hasSpecificLocation,
        locations: [...new Set(locations)] // Remove duplicates
    };
}

// Extract meaningful search terms from user query
function extractSearchTerms(query) {
    // Common words to ignore
    const stopWords = [
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
        'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'i', 'am', 'looking', 'want',
        'need', 'find', 'search', 'get', 'help', 'me', 'my', 'we', 'our', 'can', 'could', 'would',
        'should', 'please', 'thank', 'you', 'thanks'
    ];
    
    // Extract words and filter out stop words
    const words = query.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Add common synonyms and related terms
    const expandedTerms = [...words];
    
    words.forEach(word => {
        // Add denomination variations
        if (word === 'orthodox') expandedTerms.push('modern orthodox', 'traditional');
        if (word === 'reform') expandedTerms.push('progressive', 'liberal');
        if (word === 'conservative') expandedTerms.push('traditional', 'masorti');
        if (word === 'chabad') expandedTerms.push('lubavitch', 'chassidic');
        
        // Add location variations
        if (word === 'nyc') expandedTerms.push('new york', 'manhattan', 'brooklyn');
        if (word === 'la') expandedTerms.push('los angeles', 'california');
        
        // Add program variations
        if (word === 'youth') expandedTerms.push('teen', 'teenagers', 'children');
        if (word === 'hebrew') expandedTerms.push('jewish', 'religious');
        if (word === 'minyan') expandedTerms.push('service', 'prayer', 'davening');
    });
    
    return [...new Set(expandedTerms)]; // Remove duplicates
}

// Search institutions using AI-generated parameters
function searchWithAIParameters(searchParams) {
    const results = [];
    
    allInstitutions.forEach(institution => {
        let score = 0;
        
        // Score based on keywords
        if (searchParams.keywords && searchParams.keywords.length > 0) {
            const institutionText = JSON.stringify(institution).toLowerCase();
            searchParams.keywords.forEach(keyword => {
                if (institutionText.includes(keyword.toLowerCase())) {
                    score += 10;
                }
            });
        }
        
        // Score based on denomination
        if (searchParams.denomination && institution.Denomination) {
            if (institution.Denomination.toLowerCase().includes(searchParams.denomination.toLowerCase())) {
                score += 20; // High priority for denomination match
            }
        }
        
        // Score based on location
        if (searchParams.location && institution['Full Address']) {
            if (institution['Full Address'].toLowerCase().includes(searchParams.location.toLowerCase())) {
                score += 15;
            }
        }
        
        // Score based on program types
        if (searchParams.programTypes && searchParams.programTypes.length > 0) {
            const programs = institution['Educational Programs'] || {};
            searchParams.programTypes.forEach(programType => {
                if (programs[programType] && programs[programType].toLowerCase().includes('yes')) {
                    score += 15;
                }
            });
        }
        
        // Score based on must-have requirements
        if (searchParams.mustHave && searchParams.mustHave.length > 0) {
            const institutionText = JSON.stringify(institution).toLowerCase();
            let hasAllRequired = true;
            
            searchParams.mustHave.forEach(requirement => {
                if (!institutionText.includes(requirement.toLowerCase())) {
                    hasAllRequired = false;
                }
            });
            
            if (hasAllRequired) {
                score += 25; // Very high priority for meeting requirements
            } else {
                score = Math.max(0, score - 10); // Penalize if missing requirements
            }
        }
        
        // Age group specific scoring
        if (searchParams.ageGroups && searchParams.ageGroups.length > 0) {
            const programs = institution['Educational Programs'] || {};
            
            searchParams.ageGroups.forEach(ageGroup => {
                switch (ageGroup) {
                    case 'youth':
                    case 'children':
                        if (programs['Youth Groups'] && programs['Youth Groups'].toLowerCase().includes('yes') ||
                            programs['Hebrew School'] && programs['Hebrew School'].toLowerCase().includes('yes')) {
                            score += 12;
                        }
                        break;
                    case 'adult':
                        if (programs['Adult Education'] && programs['Adult Education'].toLowerCase().includes('yes')) {
                            score += 12;
                        }
                        break;
                    case 'family':
                        if (programs['Family and Intergenerational Learning'] && programs['Family and Intergenerational Learning'].toLowerCase().includes('yes')) {
                            score += 12;
                        }
                        break;
                }
            });
        }
        
        if (score > 0) {
            results.push({ institution, score });
        }
    });
    
    // Sort by score and return top results
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(result => result.institution);
}

// Extract basic keywords from user query as fallback
function extractKeywords(query) {
    const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'am', 'looking', 'want', 'need', 'find'];
    return query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.includes(word))
        .slice(0, 10); // Limit to 10 keywords
}

// Simulate AI search functionality
function simulateAISearch(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    // Enhanced keyword matching with scoring
    allInstitutions.forEach(institution => {
        let score = 0;
        
        // Search in institution name
        if (institution['Synagogue Name'].toLowerCase().includes(queryLower)) {
            score += 10;
        }
        
        // Search in denomination
        if (institution.Denomination && institution.Denomination.toLowerCase().includes(queryLower)) {
            score += 8;
        }
        
        // Search in address for location-based queries
        if (institution['Full Address'].toLowerCase().includes(queryLower)) {
            score += 6;
        }
        
        // Search in educational programs
        const programs = institution['Educational Programs'];
        if (programs) {
            for (const program in programs) {
                if (program.toLowerCase().includes(queryLower) || 
                    programs[program].toLowerCase().includes(queryLower)) {
                    score += 5;
                }
            }
        }
        
        // Keyword-based scoring for common queries
        const keywords = {
            'orthodox': ['orthodox'],
            'reform': ['reform'],
            'conservative': ['conservative'],
            'chabad': ['chabad'],
            'youth': ['youth', 'teen', 'children'],
            'school': ['school', 'education', 'hebrew'],
            'family': ['family', 'intergenerational'],
            'online': ['online', 'virtual', 'zoom'],
            'hillel': ['hillel', 'university', 'college'],
            'programs': ['programs', 'activities', 'classes']
        };
        
        for (const category in keywords) {
            if (queryLower.includes(category)) {
                keywords[category].forEach(keyword => {
                    if (JSON.stringify(institution).toLowerCase().includes(keyword)) {
                        score += 3;
                    }
                });
            }
        }
        
        // Location-specific queries
        const locationTerms = ['near me', 'nearby', 'close', 'local'];
        if (locationTerms.some(term => queryLower.includes(term))) {
            // For demo purposes, we'll prioritize institutions with comprehensive programs
            if (programs && Object.keys(programs).length > 5) {
                score += 4;
            }
        }
        
        if (score > 0) {
            results.push({ institution, score });
        }
    });
    
    // Sort by score and return top results
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(result => result.institution);
}

// Search by zipcode and nearby areas
function searchByZipcode() {
    const zipcode = document.getElementById('zipcodeInput').value.trim();
    if (!zipcode) return;
    
    showLoading();
    
    setTimeout(() => {
        const results = findNearbyZipCodes(zipcode);
        displayResults(results, `Results for ${zipcode} and nearby areas`);
        hideLoading();
        scrollToResults();
    }, 500);
}

// Find institutions in the searched zip code and nearby zip codes
function findNearbyZipCodes(searchZip) {
    const results = [];
    const searchZipNum = parseInt(searchZip);
    
    // First, add exact match if it exists
    if (institutionsData[searchZip]) {
        institutionsData[searchZip].forEach(inst => {
            results.push({ ...inst, zipCode: searchZip, distance: 0 });
        });
    }
    
    // Then find nearby zip codes (within a reasonable range)
    const nearbyZips = [];
    
    for (const zipCode in institutionsData) {
        const zipNum = parseInt(zipCode);
        if (zipNum && Math.abs(zipNum - searchZipNum) <= 50) { // Within 50 zip code numbers
            nearbyZips.push(zipCode);
        }
    }
    
    // Add results from nearby zip codes
    nearbyZips.forEach(zipCode => {
        if (zipCode !== searchZip) { // Don't duplicate exact match
            institutionsData[zipCode].forEach(inst => {
                const distance = Math.abs(parseInt(zipCode) - searchZipNum);
                results.push({ ...inst, zipCode: zipCode, distance: distance });
            });
        }
    });
    
    // Sort by distance (exact match first, then by proximity)
    results.sort((a, b) => a.distance - b.distance);
    
    // Limit to reasonable number of results
    return results.slice(0, 20);
}

// Search by category
function searchByCategory(category) {
    showLoading();
    
    setTimeout(() => {
        let results = [];
        
        switch(category) {
            case 'synagogue':
                results = allInstitutions.filter(inst => 
                    inst['Synagogue Name'] && 
                    !inst['Synagogue Name'].toLowerCase().includes('hillel')
                );
                break;
            case 'school':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    return programs && programs['Hebrew School'] && 
                           programs['Hebrew School'].toLowerCase().includes('yes');
                });
                break;
            case 'youth':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    const hasYouthPrograms = programs && programs['Youth Groups'] && 
                                           programs['Youth Groups'].toLowerCase().includes('yes');
                    const hasHebrewSchool = programs && programs['Hebrew School'] && 
                                          programs['Hebrew School'].toLowerCase().includes('yes');
                    
                    // Only show if has youth programs BUT NOT if it's primarily a Hebrew School
                    return hasYouthPrograms && !hasHebrewSchool;
                });
                break;
            case 'education':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    return programs && programs['Adult Education'] && 
                           programs['Adult Education'].toLowerCase().includes('yes');
                });
                break;
            case 'hillel':
                results = allInstitutions.filter(inst => 
                    inst['Synagogue Name'].toLowerCase().includes('hillel')
                );
                break;
            case 'community':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    return programs && programs['Family and Intergenerational Learning'] && 
                           programs['Family and Intergenerational Learning'].toLowerCase().includes('yes');
                });
                break;
        }
        
        displayResults(results.slice(0, 20), `${category.charAt(0).toUpperCase() + category.slice(1)} Results`);
        hideLoading();
        scrollToResults();
    }, 500);
}

// Search by affiliation
function searchByAffiliation(affiliation) {
    showLoading();
    
    setTimeout(() => {
        const results = allInstitutions.filter(inst => 
            inst.Denomination && 
            inst.Denomination.toLowerCase().includes(affiliation.toLowerCase())
        );
        
        displayResults(results.slice(0, 20), `${affiliation} Institutions`);
        hideLoading();
        scrollToResults();
    }, 500);
}

// Display results
function displayResults(results, title) {
    const searchResults = document.getElementById('searchResults');
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsTitle = document.getElementById('resultsTitle');
    
    if (results.length === 0) {
        resultsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <h3>No results found</h3>
                <p>Try adjusting your search criteria or try a different search term.</p>
            </div>
        `;
    } else {
        resultsGrid.innerHTML = results.map(createInstitutionCard).join('');
    }
    
    // Update title - hide if empty
    if (resultsTitle) {
        if (title && title.trim()) {
            resultsTitle.textContent = title;
            resultsTitle.style.display = 'block';
        } else {
            resultsTitle.style.display = 'none';
        }
    }
    searchResults.style.display = 'block';
}

// Create institution card HTML
function createInstitutionCard(institution) {
    const programs = institution['Educational Programs'] || {};
    const availablePrograms = [];
    
    // Extract available programs
    for (const program in programs) {
        if (programs[program].toLowerCase().includes('yes')) {
            availablePrograms.push(program);
        }
    }
    
    return `
        <div class="institution-card">
            <div class="card-header">
                <div class="card-title">${institution['Synagogue Name']}</div>
                <div class="card-denomination">${institution.Denomination || 'N/A'}</div>
            </div>
            <div class="card-body">
                <div class="card-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${institution['Full Address']}
                </div>
                ${institution['Phone Number'] ? `
                    <div class="card-phone">
                        <i class="fas fa-phone"></i>
                        ${institution['Phone Number']}
                    </div>
                ` : ''}
                
                ${availablePrograms.length > 0 ? `
                    <div class="card-programs">
                        <strong>Available Programs:</strong><br>
                        ${availablePrograms.slice(0, 4).map(program => 
                            `<span class="program-tag">${program}</span>`
                        ).join('')}
                        ${availablePrograms.length > 4 ? `<span class="program-tag">+${availablePrograms.length - 4} more</span>` : ''}
                    </div>
                ` : ''}
                
                ${institution.Website ? `
                    <div class="card-website">
                        <a href="${institution.Website}" target="_blank" class="website-btn">
                            <i class="fas fa-external-link-alt"></i> Visit Website
                        </a>
                    </div>
                ` : ''}
                
                ${institution['AI_Description'] ? `
                    <div class="card-description">
                        <strong>About:</strong><br>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 8px; line-height: 1.4;">
                            ${institution['AI_Description'].substring(0, 200)}${institution['AI_Description'].length > 200 ? '...' : ''}
                        </p>
                    </div>
                ` : ''}
                
                ${institution['Source'] === 'AI Web Search' ? `
                    <div style="margin-top: 12px; padding: 8px; background: #e0f2fe; border-radius: 6px; border-left: 3px solid #0288d1;">
                        <div style="display: flex; align-items: center; gap: 6px; color: #0288d1; font-size: 12px; font-weight: 600;">
                            <i class="fas fa-robot"></i>
                            AI Web Search Result
                        </div>
                    </div>
                ` : ''}
                
                ${institution['Source'] === 'Local Database' ? `
                    <div style="margin-top: 12px; padding: 8px; background: #f0f9f0; border-radius: 6px; border-left: 3px solid #4caf50;">
                        <div style="display: flex; align-items: center; gap: 6px; color: #388e3c; font-size: 12px; font-weight: 600;">
                            <i class="fas fa-database"></i>
                            Local Database Match
                        </div>
                    </div>
                ` : ''}
                
                <div class="card-actions">
                    <button class="connect-btn" onclick="connectToInstitution('${institution['Synagogue Name'].replace(/'/g, "\\'")}', '${institution.Denomination || 'N/A'}', '${institution['Full Address'].replace(/'/g, "\\'")}', '${getInstitutionType(institution)}')">
                        <i class="fas fa-plus"></i> Connect
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load recommendations based on cookies/preferences (simulated)
function loadRecommendations() {
    if (allInstitutions.length === 0) return;
    
    // Simulate user preferences based on "cookies"
    const userPreferences = getUserPreferences();
    let recommendations = [];
    
    // Generate recommendations based on preferences
    if (userPreferences.includes('family')) {
        recommendations.push(...allInstitutions.filter(inst => {
            const programs = inst['Educational Programs'];
            return programs && programs['Family and Intergenerational Learning'] && 
                   programs['Family and Intergenerational Learning'].toLowerCase().includes('yes');
        }).slice(0, 2));
    }
    
    if (userPreferences.includes('youth')) {
        recommendations.push(...allInstitutions.filter(inst => {
            const programs = inst['Educational Programs'];
            return programs && programs['Youth Groups'] && 
                   programs['Youth Groups'].toLowerCase().includes('yes');
        }).slice(0, 2));
    }
    
    if (userPreferences.includes('education')) {
        recommendations.push(...allInstitutions.filter(inst => {
            const programs = inst['Educational Programs'];
            return programs && programs['Adult Education'] && 
                   programs['Adult Education'].toLowerCase().includes('yes');
        }).slice(0, 2));
    }
    
    // If no specific preferences, show diverse institutions
    if (recommendations.length === 0) {
        // Get a mix of different denominations and programs
        const denominations = ['Reform', 'Conservative', 'Orthodox', 'Chabad'];
        denominations.forEach(denom => {
            const inst = allInstitutions.find(i => 
                i.Denomination && i.Denomination.includes(denom)
            );
            if (inst) recommendations.push(inst);
        });
    }
    
    // Remove duplicates and limit to 6
    recommendations = [...new Set(recommendations)].slice(0, 6);
    
    // Display recommendations
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    recommendationsGrid.innerHTML = recommendations.map(createInstitutionCard).join('');
}

// Simulate getting user preferences from cookies
function getUserPreferences() {
    // In a real app, this would read from actual cookies or user profile
    const preferences = localStorage.getItem('userPreferences');
    if (preferences) {
        return JSON.parse(preferences);
    }
    
    // Default preferences for demo
    const defaultPrefs = ['family', 'education', 'youth'];
    localStorage.setItem('userPreferences', JSON.stringify(defaultPrefs));
    return defaultPrefs;
}

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function scrollToResults() {
    document.getElementById('searchResults').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Update user preferences (for future enhancement)
function updateUserPreferences(newPreferences) {
    localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
    loadRecommendations(); // Refresh recommendations
}

// Enhanced search with geolocation (for future enhancement)
function searchNearMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // In a real app, you would use a geocoding service to find nearby zip codes
            // For now, we'll just show a selection of institutions
            const sampleResults = allInstitutions.slice(0, 10);
            displayResults(sampleResults, 'Institutions Near You');
            scrollToResults();
        });
    }
}

// Initialize search suggestions (for future enhancement)
function initializeSearchSuggestions() {
    const aiSearchInput = document.getElementById('aiSearchInput');
    
    // Create a datalist for suggestions
    const datalist = document.createElement('datalist');
    datalist.id = 'searchSuggestions';
    
    const suggestions = [
        'Orthodox synagogue with youth programs',
        'Reform temple with Hebrew school',
        'Conservative synagogue near me',
        'Chabad house with family programs',
        'Jewish day school',
        'Hillel at university',
        'Synagogue with online services',
        'Jewish community center',
        'Adult education classes',
        'Bar/Bat Mitzvah preparation'
    ];
    
    suggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        datalist.appendChild(option);
    });
    
    document.body.appendChild(datalist);
    aiSearchInput.setAttribute('list', 'searchSuggestions');
}

// =============================================================================
// AUTHENTICATION SYSTEM
// =============================================================================

// Database simulation - In a real application, this would be handled by a backend server
let userDatabase = JSON.parse(localStorage.getItem('jewishMappedUsers')) || [];
let currentUser = JSON.parse(localStorage.getItem('jewishMappedCurrentUser')) || null;

// Authentication Modal Functions
function openAuthModal() {
    console.log('openAuthModal called');
    const modal = document.getElementById('authModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.style.display = 'flex';
        showLoginForm();
    } else {
        console.error('Modal element not found!');
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    // Clear forms
    document.getElementById('loginForm').querySelector('form').reset();
    document.getElementById('signupForm').querySelector('form').reset();
    hideOtherInterestField();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Find user in database
    const user = userDatabase.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Successful login
        currentUser = user;
        localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
        
        alert(`Welcome back, ${user.firstName}!`);
        closeAuthModal();
        updateUIForLoggedInUser();
    } else {
        alert('Invalid email or password. Please try again.');
    }
}

// Handle Signup
function handleSignup(event) {
    event.preventDefault();
    
    // Collect form data
    const formData = {
        id: Date.now(), // Simple ID generation
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('signupEmail').value,
        password: document.getElementById('signupPassword').value,
        address1: document.getElementById('address1').value,
        address2: document.getElementById('address2').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        homeAddress: buildFullAddress(), // Combined address for backward compatibility
        jewishAffiliation: document.getElementById('jewishAffiliation').value,
        interests: getSelectedInterests(),
        otherInterestDetails: document.getElementById('otherInterestDetails').value,
        registrationDate: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
    
    // Validate required fields
    if (!validateSignupForm(formData)) {
        return;
    }
    
    // Check if email already exists
    if (userDatabase.find(u => u.email === formData.email)) {
        alert('An account with this email already exists. Please use a different email or sign in.');
        return;
    }
    
    // Add user to database
    userDatabase.push(formData);
    localStorage.setItem('jewishMappedUsers', JSON.stringify(userDatabase));
    
    // Log user in automatically
    currentUser = formData;
    localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
    
    // Show success message with storage info
    alert(`Welcome to Jewish Mapped, ${formData.firstName}! Your account has been created successfully.\n\nYour data is stored locally in your browser's localStorage for this demo.`);
    
    console.log('User data stored in localStorage:', formData);
    console.log('All users database:', userDatabase);
    
    closeAuthModal();
    updateUIForLoggedInUser();
    
    // Redirect to profile page after signup
    setTimeout(() => {
        showProfilePage();
    }, 500);
}

// Get selected interests from checkboxes
function getSelectedInterests() {
    const checkboxes = document.querySelectorAll('input[name="interests"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Build full address from separate fields
function buildFullAddress() {
    const address1 = document.getElementById('address1').value.trim();
    const address2 = document.getElementById('address2').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const zipCode = document.getElementById('zipCode').value.trim();
    
    let fullAddress = address1;
    if (address2) {
        fullAddress += ', ' + address2;
    }
    fullAddress += ', ' + city + ', ' + state + ' ' + zipCode;
    
    return fullAddress;
}

// Validate signup form
function validateSignupForm(data) {
    if (!data.firstName.trim()) {
        alert('Please enter your first name.');
        return false;
    }
    
    if (!data.lastName.trim()) {
        alert('Please enter your last name.');
        return false;
    }
    
    if (!data.email.trim()) {
        alert('Please enter your email address.');
        return false;
    }
    
    if (!data.password || data.password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return false;
    }
    
    if (!data.address1.trim()) {
        alert('Please enter your street address.');
        return false;
    }
    
    if (!data.city.trim()) {
        alert('Please enter your city.');
        return false;
    }
    
    if (!data.state.trim()) {
        alert('Please enter your state.');
        return false;
    }
    
    if (!data.zipCode.trim()) {
        alert('Please enter your zip code.');
        return false;
    }
    
    // Validate zip code format
    const zipPattern = /^[0-9]{5}(-[0-9]{4})?$/;
    if (!zipPattern.test(data.zipCode.trim())) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789).');
        return false;
    }
    
    if (!data.jewishAffiliation) {
        alert('Please select your Jewish affiliation.');
        return false;
    }
    
    if (data.interests.length === 0) {
        alert('Please select at least one interest.');
        return false;
    }
    
    // If "other" is selected, make sure they filled out the details
    if (data.interests.includes('other') && !data.otherInterestDetails.trim()) {
        alert('Please describe your other interests.');
        return false;
    }
    
    return true;
}

// Show/hide other interest field
function setupOtherInterestToggle() {
    const otherCheckbox = document.getElementById('otherInterest');
    const otherGroup = document.getElementById('otherInterestGroup');
    
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherGroup.style.display = 'block';
                document.getElementById('otherInterestDetails').required = true;
            } else {
                otherGroup.style.display = 'none';
                document.getElementById('otherInterestDetails').required = false;
                document.getElementById('otherInterestDetails').value = '';
            }
        });
    }
}

function hideOtherInterestField() {
    document.getElementById('otherInterestGroup').style.display = 'none';
    document.getElementById('otherInterestDetails').required = false;
}

// Update UI for logged-in user
function updateUIForLoggedInUser() {
    const signInBtn = document.querySelector('.sign-in-btn');
    const profileLink = document.getElementById('myProfileLink');
    
    if (currentUser && signInBtn) {
        signInBtn.textContent = `Hi, ${currentUser.firstName}`;
        signInBtn.onclick = showUserProfile;
        
        // Show My Profile link
        if (profileLink) {
            profileLink.style.display = 'inline-block';
        }
    }
}

// Show user profile (placeholder)
function showUserProfile() {
    if (currentUser) {
        alert(`User Profile:\n\nName: ${currentUser.firstName} ${currentUser.lastName}\nEmail: ${currentUser.email}\nAffiliation: ${currentUser.jewishAffiliation}\nInterests: ${currentUser.interests.join(', ')}\n\nClick here to log out.`);
        
        // Simple logout option
        if (confirm('Would you like to log out?')) {
            logout();
        }
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('jewishMappedCurrentUser');
    
    const signInBtn = document.querySelector('.sign-in-btn');
    const profileLink = document.getElementById('myProfileLink');
    
    if (signInBtn) {
        signInBtn.textContent = 'Sign in';
        signInBtn.onclick = openAuthModal;
    }
    
    // Hide My Profile link
    if (profileLink) {
        profileLink.style.display = 'none';
    }
    
    // Hide profile page if currently viewing it
    const profilePage = document.getElementById('profilePage');
    if (profilePage && profilePage.style.display === 'block') {
        hideProfilePage();
    }
    
    alert('You have been logged out successfully.');
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    setupOtherInterestToggle();
    
    // Check if user is already logged in
    if (currentUser) {
        updateUIForLoggedInUser();
    }
    
    // Close modal when clicking outside
    document.getElementById('authModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAuthModal();
        }
    });
});

// =============================================================================
// PROFILE PAGE FUNCTIONALITY
// =============================================================================

// Show profile page
function showProfilePage() {
    if (!currentUser) {
        alert('Please sign in to view your profile.');
        openAuthModal();
        return;
    }
    
    // Clear all search inputs when navigating to profile
    clearAllSearchInputs();
    
    // Hide other sections
    document.querySelector('.hero').style.display = 'none';
    document.getElementById('searchResults').style.display = 'none';
    
    // Show profile page
    document.getElementById('profilePage').style.display = 'block';
    
    // Load profile data
    loadProfileData();
    loadUserConnections();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Hide profile page and return to main view
function hideProfilePage() {
    // Clear all search inputs when returning from profile
    clearAllSearchInputs();
    
    document.getElementById('profilePage').style.display = 'none';
    document.querySelector('.hero').style.display = 'block';
    window.scrollTo(0, 0);
}

// Return to home page - hides all other pages and shows the hero section
function returnToHome() {
    // Clear all search inputs when returning home
    clearAllSearchInputs();
    
    // Hide all other sections
    document.getElementById('profilePage').style.display = 'none';
    document.getElementById('searchResults').style.display = 'none';
    
    // Show the hero section (home page)
    document.querySelector('.hero').style.display = 'block';
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Clear the AI search input field
function clearAISearchInput() {
    const aiSearchInput = document.getElementById('aiSearchInput');
    if (aiSearchInput) {
        aiSearchInput.value = '';
        console.log('AI search input cleared');
    }
}

// Clear the zip code input field
function clearZipcodeInput() {
    const zipcodeInput = document.getElementById('zipcodeInput');
    if (zipcodeInput) {
        zipcodeInput.value = '';
        console.log('Zip code input cleared');
    }
}

// Clear all search inputs
function clearAllSearchInputs() {
    clearAISearchInput();
    clearZipcodeInput();
}

// Load user profile data into the profile page
function loadProfileData() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileAddress').textContent = currentUser.homeAddress || `${currentUser.address1}, ${currentUser.city}, ${currentUser.state} ${currentUser.zipCode}`;
    document.getElementById('profileAffiliation').textContent = currentUser.jewishAffiliation || 'Not specified';
    document.getElementById('profileInterests').textContent = currentUser.interests.join(', ') || 'None specified';
    
    // Format registration date
    const regDate = new Date(currentUser.registrationDate);
    document.getElementById('profileMemberSince').textContent = regDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Get institution type for connection categorization
function getInstitutionType(institution) {
    const name = institution['Synagogue Name'].toLowerCase();
    const programs = institution['Educational Programs'] || {};
    
    if (name.includes('hillel')) return 'hillel';
    if (programs['Hebrew School'] && programs['Hebrew School'].toLowerCase().includes('yes')) return 'school';
    if (programs['Youth Groups'] && programs['Youth Groups'].toLowerCase().includes('yes')) return 'youth';
    if (programs['Family and Intergenerational Learning'] && programs['Family and Intergenerational Learning'].toLowerCase().includes('yes')) return 'community';
    return 'synagogue';
}

// Connect to an institution
function connectToInstitution(name, denomination, address, type) {
    if (!currentUser) {
        alert('Please sign in to connect with institutions.');
        openAuthModal();
        return;
    }
    
    // Get existing connections
    const connections = getUserConnections();
    
    // Check if already connected
    const existingConnection = connections.find(conn => conn.name === name);
    if (existingConnection) {
        alert(`You're already connected to ${name}!`);
        return;
    }
    
    // Create new connection
    const newConnection = {
        id: Date.now(),
        name: name,
        denomination: denomination,
        address: address,
        type: type,
        connectedDate: new Date().toISOString(),
        status: 'active'
    };
    
    // Add to connections
    connections.push(newConnection);
    saveUserConnections(connections);
    
    // Update current user's connections count
    currentUser.connectionsCount = connections.length;
    localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
    
    // Show success message
    alert(`Successfully connected to ${name}! You can view all your connections in your profile.`);
    
    // If profile page is open, refresh it
    const profilePage = document.getElementById('profilePage');
    if (profilePage.style.display === 'block') {
        loadUserConnections();
    }
}

// Get user's connections from localStorage
function getUserConnections() {
    if (!currentUser) return [];
    
    const connectionsKey = `connections_${currentUser.id}`;
    const connections = localStorage.getItem(connectionsKey);
    return connections ? JSON.parse(connections) : [];
}

// Save user's connections to localStorage
function saveUserConnections(connections) {
    if (!currentUser) return;
    
    const connectionsKey = `connections_${currentUser.id}`;
    localStorage.setItem(connectionsKey, JSON.stringify(connections));
}

// Load and display user connections
function loadUserConnections() {
    const connections = getUserConnections();
    
    // Update stats
    document.getElementById('totalConnections').textContent = connections.length;
    
    // Calculate recent connections (this month)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const recentConnections = connections.filter(conn => 
        new Date(conn.connectedDate) >= thisMonth
    );
    document.getElementById('recentConnections').textContent = recentConnections.length;
    
    // Display connections
    displayConnections(connections);
}

// Display connections in the list
function displayConnections(connections, filter = 'all') {
    const connectionsList = document.getElementById('connectionsList');
    
    // Filter connections
    let filteredConnections = connections;
    if (filter !== 'all') {
        filteredConnections = connections.filter(conn => conn.type === filter);
    }
    
    if (filteredConnections.length === 0) {
        connectionsList.innerHTML = `
            <div class="no-connections">
                <i class="fas fa-heart"></i>
                <h4>${filter === 'all' ? 'No connections yet' : `No ${filter} connections`}</h4>
                <p>${filter === 'all' ? 
                    'Start exploring Jewish institutions and programs to build your community network!' :
                    `You haven't connected with any ${filter} institutions yet.`
                }</p>
                <button class="explore-btn" onclick="hideProfilePage()">
                    <i class="fas fa-search"></i>
                    Explore Now
                </button>
            </div>
        `;
        return;
    }
    
    // Sort by connection date (newest first)
    filteredConnections.sort((a, b) => new Date(b.connectedDate) - new Date(a.connectedDate));
    
    connectionsList.innerHTML = filteredConnections.map(connection => `
        <div class="connection-item">
            <div class="connection-header">
                <div>
                    <div class="connection-name">${connection.name}</div>
                    <span class="connection-type">${connection.denomination}</span>
                </div>
                <div class="connection-date">
                    Connected: ${new Date(connection.connectedDate).toLocaleDateString()}
                </div>
            </div>
            
            <div class="connection-address">
                <i class="fas fa-map-marker-alt"></i>
                ${connection.address}
            </div>
            
            <div class="connection-actions">
                <button class="connection-btn primary" onclick="visitConnectionWebsite('${connection.name}')">
                    <i class="fas fa-external-link-alt"></i> Visit
                </button>
                <button class="connection-btn" onclick="contactConnection('${connection.name}')">
                    <i class="fas fa-phone"></i> Contact
                </button>
                <button class="connection-btn" onclick="removeConnection(${connection.id})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

// Filter connections by type
function filterConnections(type) {
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Display filtered connections
    const connections = getUserConnections();
    displayConnections(connections, type);
}

// Visit connection website (placeholder)
function visitConnectionWebsite(institutionName) {
    // In a real app, this would open the institution's website
    // For now, we'll just show a message
    alert(`Opening website for ${institutionName}...`);
}

// Contact connection (placeholder)
function contactConnection(institutionName) {
    alert(`Contact information for ${institutionName} would be displayed here.`);
}

// Remove a connection
function removeConnection(connectionId) {
    if (!confirm('Are you sure you want to remove this connection?')) {
        return;
    }
    
    const connections = getUserConnections();
    const updatedConnections = connections.filter(conn => conn.id !== connectionId);
    
    saveUserConnections(updatedConnections);
    
    // Update current user's connections count
    currentUser.connectionsCount = updatedConnections.length;
    localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
    
    // Refresh the connections display
    loadUserConnections();
}

// Edit profile (placeholder)
function editProfile() {
    alert('Profile editing functionality would be implemented here. This would open a form to edit user information.');
}

// =============================================================================
// DATA STORAGE INFORMATION
// =============================================================================

/*
USER DATA STORAGE INFORMATION:

All user data is currently stored in the browser's localStorage for demonstration purposes.
This includes:

1. User Registration Data:
   - firstName: User's first name
   - lastName: User's last name  
   - email: Email address (used for login)
   - password: Password (stored as plain text for demo - would be hashed in production)
   - homeAddress: Complete home address
   - jewishAffiliation: Selected Jewish affiliation
   - interests: Array of selected interests
   - otherInterestDetails: Description of other interests (if selected)
   - registrationDate: When account was created
   - lastLogin: Last login timestamp

2. Storage Location:
   - localStorage key: 'jewishMappedUsers' (array of all users)
   - localStorage key: 'jewishMappedCurrentUser' (currently logged in user)

3. Accessing the Data:
   - Open browser dev tools (F12)
   - Go to Application tab > Local Storage
   - Look for 'jewishMappedUsers' and 'jewishMappedCurrentUser'

4. In Production:
   - Data would be stored in a secure database (PostgreSQL, MongoDB, etc.)
   - Passwords would be hashed using bcrypt or similar
   - User sessions would be managed with JWT tokens or server sessions
   - Personal data would be encrypted and comply with privacy regulations
   - Regular backups and data protection measures would be implemented

5. Current Demo Features:
   - User registration with all requested fields
   - Login/logout functionality
   - Data persistence across browser sessions
   - Form validation
   - Interest selection with "other" option handling
*/ 