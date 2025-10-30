/**
 * YAML Converter Module
 * 
 * Provides functions to convert between YAML and JSON formats
 * for the JSON editor component.
 */

import yaml from 'js-yaml';

class YAMLConverter {
  constructor() {
    this.data = {};
  }

  /**
   * Set data from YAML string
   * @param {string} yamlString - YAML formatted string
   * @returns {boolean} - Success status
   */
  setYaml(yamlString) {
    try {
      this.data = yaml.load(yamlString);
      return true;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return false;
    }
  }

  /**
   * Get data as YAML string
   * @returns {string} - YAML formatted string
   */
  getYaml() {
    try {
      return yaml.dump(this.data, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
    } catch (error) {
      console.error('Error converting to YAML:', error);
      return '';
    }
  }

  /**
   * Set data from JSON string
   * @param {string} jsonString - JSON formatted string
   * @returns {boolean} - Success status
   */
  setJSON(jsonString) {
    try {
      this.data = JSON.parse(jsonString);
      return true;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return false;
    }
  }

  /**
   * Get data as JSON string
   * @returns {string} - JSON formatted string
   */
  getJSON() {
    try {
      return JSON.stringify(this.data, null, 2);
    } catch (error) {
      console.error('Error converting to JSON:', error);
      return '';
    }
  }

  /**
   * Get raw data object
   * @returns {Object} - The internal data object
   */
  getData() {
    return this.data;
  }

  /**
   * Set raw data object
   * @param {Object} data - The data object to set
   */
  setData(data) {
    this.data = data;
  }
}

export default YAMLConverter;
