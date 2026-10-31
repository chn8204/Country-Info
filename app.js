const COUNTRY_API_URL = "https://api.worldbank.org/v2/country";
const POPULATION_INDICATOR = "SP.POP.TOTL";

let countriesPromise;

async function fetchJson(url) {
const response = await fetch(url);

if (!response.ok) {
throw new Error(`Country service returned HTTP ${response.status}.`);
}

return response.json();
}

function getCountries() {
if (!countriesPromise) {
countriesPromise = fetchJson(
`${COUNTRY_API_URL}?format=json&per_page=400`
)
.then(data => {
if (!Array.isArray(data?.[1])) {
throw new Error("The country service returned an invalid country list.");
}

return data[1].filter(country => country.region?.value !== "Aggregates");
})
.catch(error => {
countriesPromise = undefined;
throw error;
});
}

return countriesPromise;
}

function normalize(value) {
return value
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.toLowerCase()
.trim();
}

async function getPopulation(countryCode) {
const url = new URL(
`${COUNTRY_API_URL}/${encodeURIComponent(countryCode)}/indicator/${POPULATION_INDICATOR}`
);
url.searchParams.set("format", "json");
url.searchParams.set("per_page", "1");

const data = await fetchJson(url);
const population = data?.[1]?.[0]?.value;

return typeof population === "number"
? population.toLocaleString()
: "Unavailable";
}

function createCountryCard(country, populationText) {
const card = document.createElement("article");
card.className = "country-card";

if (country.iso2Code) {
const flag = document.createElement("img");
flag.src = `https://flagcdn.com/w320/${country.iso2Code.toLowerCase()}.png`;
flag.alt = `${country.name} flag`;
flag.loading = "lazy";
card.appendChild(flag);
}

const title = document.createElement("h2");
title.textContent = country.name;

const details = document.createElement("dl");
const fields = [
["Capital", country.capitalCity || "Unavailable"],
["Population", populationText],
["Region", country.region?.value || "Unavailable"]
];

for (const [label, value] of fields) {
const row = document.createElement("div");
const term = document.createElement("dt");
term.textContent = label;
const description = document.createElement("dd");
description.textContent = value;
row.append(term, description);
details.appendChild(row);
}

card.append(title, details);
return card;
}

async function getCountry() {
const input = document.getElementById("countryInput");
const button = document.querySelector("#searchForm button");
const result = document.getElementById("result");
const query = input.value.trim();

if (!query) {
result.textContent = "Please enter a country name.";
input.focus();
return;
}

button.disabled = true;
result.textContent = "Searching for country information...";

try {
const countries = await getCountries();
const normalizedQuery = normalize(query);
const country =
countries.find(country =>
[country.name, country.id, country.iso2Code].some(
value => value && normalize(value) === normalizedQuery
)
) ||
countries.find(country => normalize(country.name).startsWith(normalizedQuery)) ||
countries.find(country => normalize(country.name).includes(normalizedQuery));

if (!country) {
result.textContent = "Country not found. Check the spelling and try again.";
return;
}

let populationText = "Unavailable";

try {
populationText = await getPopulation(country.id);
} catch (error) {
console.error("Population lookup failed:", error);
}

result.replaceChildren(createCountryCard(country, populationText));
} catch (error) {
console.error("Country lookup failed:", error);
result.textContent =
"Could not connect to the country service. Check your internet connection and try again.";
} finally {
button.disabled = false;
}
}

document.getElementById("searchForm").addEventListener("submit", event => {
event.preventDefault();
getCountry();
});
