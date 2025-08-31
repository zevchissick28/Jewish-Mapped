// Global variables
let institutionsData = {};
let allInstitutions = [];

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

// AI Search Handler (simulated)
async function handleAISearch() {
    const query = document.getElementById('aiSearchInput').value.trim();
    if (!query) return;
    
    showLoading();
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // AI-powered search simulation
    const results = simulateAISearch(query);
    displayResults(results, `AI Search Results for: "${query}"`);
    
    hideLoading();
    scrollToResults();
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
    
    // Update title
    if (resultsTitle) {
        resultsTitle.textContent = title;
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