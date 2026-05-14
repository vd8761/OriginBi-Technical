// Package evaluationtestcase implements the evaluation.testcase addon plugin.
package evaluationtestcase

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

const Slug = "evaluation.testcase"

func Compare(comparator string, expected string, actual string, config json.RawMessage) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(comparator)) {
	case "", "trim_equal":
		return strings.TrimSpace(actual) == strings.TrimSpace(expected), nil
	case "strict":
		return actual == expected, nil
	case "json":
		return compareJSON(expected, actual)
	case "regex":
		return regexp.MatchString(expected, actual)
	case "custom_checker":
		return false, fmt.Errorf("custom_checker comparator is not implemented")
	default:
		return false, fmt.Errorf("unknown comparator %q", comparator)
	}
}

func compareJSON(expected string, actual string) (bool, error) {
	var e any
	var a any
	if err := json.Unmarshal([]byte(expected), &e); err != nil {
		return false, fmt.Errorf("expected JSON is invalid: %w", err)
	}
	if err := json.Unmarshal([]byte(actual), &a); err != nil {
		return false, nil
	}
	eb, _ := json.Marshal(e)
	ab, _ := json.Marshal(a)
	return string(eb) == string(ab), nil
}
