string profileLocal = @"C:\test1";
FirefoxDriverService firefoxService = FirefoxDriverService.CreateDefaultService();
FirefoxOptions optionsFirefox = new FirefoxOptions();
firefoxService.HideCommandPromptWindow = true;
optionsFirefox.AddArgument("-profile");
optionsFirefox.AddArgument(profileLocal);
var webDriver = new FirefoxDriver(firefoxService, optionsFirefox);
