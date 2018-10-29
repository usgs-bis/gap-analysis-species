'''
This is a temporary way to grab up a set of contact details from an item in ScienceBase and dump it out to a file called authors.json that serves as an example of a standard file we would look for in an Analysis Package. A better solution would be to store this in something more standardized like json-ld syntax referencing schema.org person. The idea is we want a way of storing full details for the authors of an analysis package in a file for slurping up in various routines. This is one possible way to get there.
'''

import requests
import json

item = requests.get('https://www.sciencebase.gov/catalog/item/5645fa07e4b0e2669b30f267?format=json&fields=contacts').json()

with open('authors.json', 'w') as fp:
    json.dump(item['contacts'], fp, indent=4)
    fp.close()
