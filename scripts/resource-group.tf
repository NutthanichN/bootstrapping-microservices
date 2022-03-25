# Creates a resource group for FlixTube in your Azure account.

# resource "resource_type" "resource_name"
resource "azurerm_resource_group" "flixtube" {
  name     = "flixtube"
  location = "Southeast Asia"
}
