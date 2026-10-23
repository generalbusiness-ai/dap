# Package graph

`@generalbusiness/dap-package-graph` provides portable data readers and bounded
checks for application package composition. Its root exports graph types,
composition readers, graph checks and field-type inclusion checks. It depends
only on the coordinated `@generalbusiness/dap-contract` package.

The checks validate supplied data and relationships. They do not grant native
application authority, install a package, choose a deployed platform or contact
a service. Callers must supply the documented bounds and preserve returned
findings. Bytes codecs and the definition validator use the same graph checks.

The reviewed seven-package SDK release plan includes this package. Its new
producer and checker have not run at this source delivery. No publication or
public consumer acceptance is claimed.
